-- P5.1b: Rename existing roles and add finance_manager
-- Uses ALTER TYPE ... RENAME VALUE (PostgreSQL 10+) for atomic, non-destructive rename.
-- Existing rows in "users" table are updated automatically by the enum rename.

-- Step 1: Rename existing values
ALTER TYPE "UserRole" RENAME VALUE 'owner' TO 'tenant_owner';
ALTER TYPE "UserRole" RENAME VALUE 'admin' TO 'tenant_admin';
ALTER TYPE "UserRole" RENAME VALUE 'manager' TO 'property_manager';
ALTER TYPE "UserRole" RENAME VALUE 'technician' TO 'operations';

-- Step 2: Add new value
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'finance_manager';
