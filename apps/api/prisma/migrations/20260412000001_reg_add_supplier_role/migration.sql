-- AlterEnum
-- This migration must be in its own file: ALTER TYPE ... ADD VALUE
-- cannot run in the same transaction as subsequent uses of the new value.
ALTER TYPE "UserRole" ADD VALUE 'supplier';
