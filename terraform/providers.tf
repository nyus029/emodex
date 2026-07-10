terraform {
  required_providers {
    vercel = {
      source  = "vercel/vercel"
      version = "~> 0.15.0"
    }
    tidbcloud = {
      source  = "tidbcloud/tidbcloud"
      version = "~> 0.1.0"
    }
  }
}

provider "vercel" {
  api_token = var.vercel_api_token
  team_id   = var.vercel_team_id
}

provider "tidbcloud" {
  public_key  = var.tidb_cloud_public_key
  private_key = var.tidb_cloud_private_key
}
