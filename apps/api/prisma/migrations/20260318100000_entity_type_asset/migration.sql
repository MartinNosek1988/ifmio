-- Add 'asset' to EntityType enum
-- PostgreSQL requires ALTER TYPE ... ADD VALUE (cannot be inside a transaction)
ALTER TYPE "EntityType" ADD VALUE IF NOT EXISTS 'asset';
