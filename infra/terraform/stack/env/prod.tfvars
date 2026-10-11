# prod: NOT deployed by V00. Indicative production posture; every cost-bearing choice needs explicit approval
# (CR AP-02). Revisit sizing with measured load before go-live.
environment = "prod"

db_instance_class        = "db.t4g.small"
db_allocated_storage     = 20
db_max_allocated_storage = 100
db_multi_az              = false # Multi-AZ doubles instance cost; enable when availability requirements justify it
db_backup_retention_days = 7
db_deletion_protection   = true
db_skip_final_snapshot   = false
enable_rds_proxy         = true # justified by production Lambda concurrency (CR §10)

cognito_deletion_protection = true
enable_smoke_client         = false

# Set real production origins and redirect URIs before the first production deployment.
web_callback_urls    = ["https://app.example.invalid/auth/callback"]
web_logout_urls      = ["https://app.example.invalid/"]
cors_allowed_origins = ["https://app.example.invalid"]

api_memory_mb          = 1024
throttling_rate_limit  = 100
throttling_burst_limit = 200

log_retention_days       = 14
dbops_log_retention_days = 30
enable_xray_tracing      = false
alarm_email              = "" # set to enable the two alarms
