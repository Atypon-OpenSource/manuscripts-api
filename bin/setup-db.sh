#!/bin/bash
PGPASSWORD=admin psql -U postgres -d test -p 5432 -c "CREATE EXTENSION btree_gin"
