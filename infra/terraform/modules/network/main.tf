# Private-only networking for fieldmate-{env}.
#
# Zero idle cost: no internet gateway, no NAT Gateway, no VPC interface endpoints. Nothing in V00 needs egress:
#   - JWTs are verified by the API Gateway JWT authorizer (no JWKS fetch from the Lambda),
#   - the database is reached with locally generated RDS IAM tokens (no Secrets Manager call at runtime),
#   - Lambda logs are shipped by the Lambda service, not through the VPC.

data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  # RDS subnet groups require at least two Availability Zones.
  azs = slice(data.aws_availability_zones.available.names, 0, 2)
}

resource "aws_vpc" "this" {
  cidr_block           = var.cidr_block
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = { Name = "fieldmate-${var.environment}" }
}

resource "aws_subnet" "private" {
  count             = length(local.azs)
  vpc_id            = aws_vpc.this.id
  availability_zone = local.azs[count.index]
  cidr_block        = cidrsubnet(var.cidr_block, 8, count.index)

  tags = { Name = "fieldmate-${var.environment}-private-${local.azs[count.index]}" }
}

# Take ownership of the default security group and leave it with no rules.
resource "aws_default_security_group" "this" {
  vpc_id = aws_vpc.this.id
}

resource "aws_security_group" "lambda" {
  name        = "fieldmate-lambda-${var.environment}"
  description = "fieldmate-api and fieldmate-db-ops Lambdas: PostgreSQL egress only"
  vpc_id      = aws_vpc.this.id
}

resource "aws_security_group" "database" {
  name        = "fieldmate-database-${var.environment}"
  description = "fieldmate-postgres (and RDS Proxy when enabled): PostgreSQL from the Lambdas only"
  vpc_id      = aws_vpc.this.id
}

resource "aws_vpc_security_group_egress_rule" "lambda_to_database" {
  security_group_id            = aws_security_group.lambda.id
  referenced_security_group_id = aws_security_group.database.id
  ip_protocol                  = "tcp"
  from_port                    = 5432
  to_port                      = 5432
  description                  = "PostgreSQL"
}

resource "aws_vpc_security_group_ingress_rule" "database_from_lambda" {
  security_group_id            = aws_security_group.database.id
  referenced_security_group_id = aws_security_group.lambda.id
  ip_protocol                  = "tcp"
  from_port                    = 5432
  to_port                      = 5432
  description                  = "PostgreSQL from Lambda"
}

# RDS Proxy shares the database security group; these rules let it reach the instance.
resource "aws_vpc_security_group_ingress_rule" "database_from_proxy" {
  security_group_id            = aws_security_group.database.id
  referenced_security_group_id = aws_security_group.database.id
  ip_protocol                  = "tcp"
  from_port                    = 5432
  to_port                      = 5432
  description                  = "PostgreSQL from RDS Proxy"
}

resource "aws_vpc_security_group_egress_rule" "proxy_to_database" {
  security_group_id            = aws_security_group.database.id
  referenced_security_group_id = aws_security_group.database.id
  ip_protocol                  = "tcp"
  from_port                    = 5432
  to_port                      = 5432
  description                  = "RDS Proxy to PostgreSQL"
}
