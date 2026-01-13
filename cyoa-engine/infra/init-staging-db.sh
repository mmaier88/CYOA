#!/bin/bash
# Initialize staging database
set -e

PGPASSWORD=${POSTGRES_PASSWORD:-cyoa_secret} psql -h postgres -U cyoa -d cyoa -c "CREATE DATABASE cyoa_staging;" 2>/dev/null || echo "Staging database already exists"
