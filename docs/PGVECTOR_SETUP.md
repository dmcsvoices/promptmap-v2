# pgvector Setup Guide for PromptMap V2

This guide explains how to set up pgvector (PostgreSQL vector extension) for PromptMap V2's vector search capabilities.

## Overview

PromptMap V2 uses pgvector to enable vector similarity search for embeddings and AI-powered features. This setup guide covers installation on macOS with Homebrew and PostgreSQL@15.

## Prerequisites

- macOS with Homebrew installed
- PostgreSQL@15 (current project setup)
- Command Line Tools for Xcode
- Administrative access to PostgreSQL database

## Installation Methods

### Method 1: Compile from Source (Recommended for PostgreSQL@15)

This is the current working setup for PromptMap V2.

#### 1. Ensure Development Tools

```bash
# Install make if not available
brew install make

# Verify PostgreSQL@15 installation
brew list postgresql@15
brew services list postgresql@15
```

#### 2. Clone and Compile pgvector

```bash
# Clone pgvector repository
cd /tmp
git clone --branch v0.8.1 https://github.com/pgvector/pgvector.git
cd pgvector

# Set PostgreSQL@15 path
export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"

# Verify pg_config points to PostgreSQL@15
which pg_config
pg_config --version

# Compile and install
make
make install
```

#### 3. Enable Extension in Database

```bash
# Connect as superuser (replace 'your_superuser' with actual username)
psql -U your_superuser -d promptmap_web -c "CREATE EXTENSION IF NOT EXISTS vector;"

# Verify installation
psql -U your_superuser -d promptmap_web -c "SELECT * FROM pg_extension WHERE extname = 'vector';"
```

#### 4. Test Vector Functionality

```sql
-- Create test table
CREATE TABLE test_vectors (
    id serial PRIMARY KEY,
    embedding vector(3)
);

-- Insert test data
INSERT INTO test_vectors (embedding) VALUES
    ('[1,2,3]'),
    ('[4,5,6]');

-- Test similarity search
SELECT * FROM test_vectors ORDER BY embedding <-> '[1,2,3]' LIMIT 5;

-- Clean up
DROP TABLE test_vectors;
```

### Method 2: Upgrade to PostgreSQL@17 (Future Option)

If you choose to upgrade PostgreSQL in the future:

```bash
# Stop current PostgreSQL@15
brew services stop postgresql@15

# Install and switch to PostgreSQL@17
brew install postgresql@17
brew link --overwrite postgresql@17
brew install pgvector
brew services start postgresql@17

# Migrate data (requires careful planning)
# pg_dumpall -h localhost -p 5432 | psql -h localhost -p 5433
```

## Configuration

### Environment Variables

Ensure your `.env` file has the correct database configuration:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=promptmap_web
DB_USER=promptmap_user
DB_PASSWORD=your_password
```

### Database Permissions

The database user needs sufficient privileges to create extensions. For development:

```sql
-- Grant superuser privileges (development only)
ALTER USER promptmap_user WITH SUPERUSER;

-- For production, create extension as superuser then grant usage
-- CREATE EXTENSION vector;
-- GRANT USAGE ON SCHEMA public TO promptmap_user;
```

## Verification

### 1. Check Extension Status

```sql
-- List all installed extensions
SELECT extname, extversion FROM pg_extension;

-- Check vector extension specifically
\dx vector
```

### 2. Backend Startup Verification

When starting PromptMap V2, look for this log message:

```
✅ pgvector extension enabled
```

If you see warnings about pgvector not being available, the extension installation needs to be completed.

### 3. Test Vector Operations

```sql
-- Test basic vector operations
SELECT '[1,2,3]'::vector + '[4,5,6]'::vector;
SELECT '[1,2,3]'::vector <-> '[4,5,6]'::vector; -- L2 distance
SELECT '[1,2,3]'::vector <#> '[4,5,6]'::vector; -- Negative inner product
SELECT '[1,2,3]'::vector <=> '[4,5,6]'::vector; -- Cosine distance
```

## Troubleshooting

### Common Issues

#### 1. "extension 'vector' is not available"

```bash
# Check if extension files exist
ls -la /opt/homebrew/opt/postgresql@15/share/postgresql@15/extension/vector*
ls -la /opt/homebrew/opt/postgresql@15/lib/postgresql/vector*

# If missing, recompile from source
```

#### 2. "permission denied to create extension"

```sql
-- Check current user privileges
\du

-- Grant superuser privileges to your user
ALTER USER your_username WITH SUPERUSER;
```

#### 3. "could not load library"

```bash
# Check library file exists and has correct permissions
ls -la /opt/homebrew/opt/postgresql@15/lib/postgresql/vector.*
file /opt/homebrew/opt/postgresql@15/lib/postgresql/vector.*
```

#### 4. Compilation Errors

```bash
# Ensure XCode Command Line Tools are installed
xcode-select --install

# Check PostgreSQL development headers
ls -la /opt/homebrew/opt/postgresql@15/include/postgresql/server/

# Verify pg_config output
pg_config --configure
```

### Version Compatibility

| PostgreSQL Version | pgvector Homebrew Support | Manual Compilation |
|-------------------|---------------------------|-------------------|
| 14                | ✅ Yes                    | ✅ Yes            |
| 15                | ❌ No                     | ✅ Yes            |
| 16                | ❌ No                     | ✅ Yes            |
| 17                | ✅ Yes                    | ✅ Yes            |

## Maintenance

### Updating pgvector

When updating pgvector (e.g., from 0.8.1 to 0.9.0):

```bash
# Stop PromptMap V2
./stop-promptmap.sh

# Update to new version
cd /tmp
git clone --branch v0.9.0 https://github.com/pgvector/pgvector.git
cd pgvector
export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"
make clean
make
make install

# Update extension in database
psql -U your_superuser -d promptmap_web -c "ALTER EXTENSION vector UPDATE;"

# Restart PromptMap V2
./start-promptmap.sh
```

### Backup Considerations

When backing up the database:

```bash
# Standard backup includes extension
pg_dump -U your_user promptmap_web > backup.sql

# Restore requires pgvector to be installed first
# Install pgvector, then:
psql -U your_user -d new_database < backup.sql
```

## Performance Optimization

### Index Types

pgvector supports multiple index types for different use cases:

```sql
-- HNSW index (recommended for most cases)
CREATE INDEX ON embeddings_table USING hnsw (embedding vector_l2_ops);
CREATE INDEX ON embeddings_table USING hnsw (embedding vector_ip_ops);
CREATE INDEX ON embeddings_table USING hnsw (embedding vector_cosine_ops);

-- IVFFlat index (for very large datasets)
CREATE INDEX ON embeddings_table USING ivfflat (embedding vector_l2_ops) WITH (lists = 100);
```

### Configuration Tuning

Add to PostgreSQL configuration for optimal performance:

```ini
# postgresql.conf additions for vector workloads
shared_preload_libraries = 'vector'
max_parallel_workers_per_gather = 2
```

## Security Considerations

### Production Setup

For production environments:

1. **Limit Extension Creation**: Only superusers should create extensions
2. **User Permissions**: Grant only necessary permissions to application users
3. **Network Security**: Ensure PostgreSQL is not exposed to public networks
4. **Data Encryption**: Use SSL/TLS for database connections

```sql
-- Production user setup example
CREATE USER promptmap_prod WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE promptmap_web TO promptmap_prod;
GRANT USAGE ON SCHEMA public TO promptmap_prod;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO promptmap_prod;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO promptmap_prod;
```

## Integration with PromptMap V2

### Backend Configuration

The backend automatically handles pgvector initialization in `backend/database/connection.py`:

```python
# Create pgvector extension if not exists
await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
logger.info("✅ pgvector extension enabled")
```

### Model Usage

Example vector field in SQLAlchemy models:

```python
from sqlalchemy import Column, Integer
from pgvector.sqlalchemy import Vector

class EmbeddingModel(Base):
    __tablename__ = "embeddings"

    id = Column(Integer, primary_key=True)
    embedding = Column(Vector(1536))  # OpenAI ada-002 dimensions
```

## Support and Resources

- **pgvector GitHub**: https://github.com/pgvector/pgvector
- **PostgreSQL Extensions**: https://www.postgresql.org/docs/current/extend-extensions.html
- **PromptMap V2 Issues**: Create GitHub issues in this repository
- **PostgreSQL Documentation**: https://www.postgresql.org/docs/

## Version Information

- **pgvector Version**: 0.8.1
- **PostgreSQL Version**: 15.14
- **Installation Method**: Compiled from source
- **Platform**: macOS (Homebrew)
- **Last Updated**: 2025-09-19