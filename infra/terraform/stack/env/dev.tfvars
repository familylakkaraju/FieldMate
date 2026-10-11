# dev: lowest cost. Single-AZ db.t4g.micro, no RDS Proxy, no tracing, no alarms, 7-day logs.
# The database is parked by default (snapshot + delete): deployments restore it and park it again, and
# .github/workflows/dev-park.yml parks anything left running every evening.
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
