resource "tidbcloud_serverless_cluster" "db" {
  project_id     = var.tidb_project_id
  name           = "my-app-db"
  cloud_provider = "AWS"
  region         = "us-east-1"
}

resource "vercel_project" "app" {
  name      = "my-awesome-project"
  framework = "nextjs"

  git_repository = {
    type = "github"
    repo = "your-github-username/your-repo-name"
  }
}

resource "vercel_project_environment_variable" "database_url" {
  project_id = vercel_project.app.id
  key        = "DATABASE_URL"
  value      = "mysql://${tidbcloud_serverless_cluster.db.user}:${tidbcloud_serverless_cluster.db.password}@${tidbcloud_serverless_cluster.db.host}:4000/test?sslaccept=strict"
  target     = ["production", "preview", "development"]
}

resource "vercel_project_environment_variable" "blob_token" {
  project_id = vercel_project.app.id
  key        = "BLOB_READ_WRITE_TOKEN"
  value      = var.vercel_blob_token
  target     = ["production", "preview", "development"]
}
