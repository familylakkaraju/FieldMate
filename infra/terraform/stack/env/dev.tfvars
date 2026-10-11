# dev: lowest cost. Single-AZ db.t4g.micro, no RDS Proxy, no tracing, no alarms, 7-day logs.
# Database lifecycle (FM-P04, ADR-006): a deployment restores a parked database from its newest park snapshot (or
# starts a stopped one), migrates, smoke tests, then stops it. .github/workflows/dev-cost-control.yml stops it every
# evening (19:00 UTC Saturday-Thursday) and parks it on Fridays (final snapshot, delete, keep the two newest).
environment = "dev"

db_instance_class        = "db.t4g.micro"
db_allocated_storage     = 20
db_multi_az              = false
db_backup_retention_days = 1
db_deletion_protection   = false
db_skip_final_snapshot   = true
enable_rds_proxy         = false

cognito_deletion_protection = false
enable_smoke_client         = true

api_memory_mb          = 1024
throttling_rate_limit  = 20
throttling_burst_limit = 40

log_retention_days       = 7
dbops_log_retention_days = 14
enable_xray_tracing      = false
alarm_email              = ""
