-- CreateTable
CREATE TABLE "Account" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "activated" BOOLEAN NOT NULL DEFAULT false,
    "resetToken" TEXT,
    "resetExpiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "RegularUser" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "accountId" INTEGER NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL DEFAULT '',
    "postalAddress" TEXT NOT NULL DEFAULT '',
    "birthday" TEXT NOT NULL DEFAULT '1970-01-01',
    "suspended" BOOLEAN NOT NULL DEFAULT false,
    "available" BOOLEAN NOT NULL DEFAULT false,
    "avatar" TEXT,
    "resume" TEXT,
    "biography" TEXT,
    "lastActiveAt" DATETIME,
    CONSTRAINT "RegularUser_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Business" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "accountId" INTEGER NOT NULL,
    "businessName" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "postalAddress" TEXT NOT NULL,
    "lat" REAL NOT NULL,
    "lon" REAL NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "avatar" TEXT,
    "biography" TEXT,
    CONSTRAINT "Business_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Admin" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "accountId" INTEGER NOT NULL,
    "utorid" TEXT NOT NULL,
    CONSTRAINT "Admin_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SystemSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "availabilityTimeout" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "PositionType" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "hidden" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "Qualification" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "regularUserId" INTEGER NOT NULL,
    "positionTypeId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'created',
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT NOT NULL DEFAULT '',
    "document" TEXT,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Qualification_regularUserId_fkey" FOREIGN KEY ("regularUserId") REFERENCES "RegularUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Qualification_positionTypeId_fkey" FOREIGN KEY ("positionTypeId") REFERENCES "PositionType" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Job" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "positionTypeId" INTEGER NOT NULL,
    "businessId" INTEGER NOT NULL,
    "workerId" INTEGER,
    "note" TEXT DEFAULT '',
    "salaryMin" REAL NOT NULL,
    "salaryMax" REAL NOT NULL,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Job_positionTypeId_fkey" FOREIGN KEY ("positionTypeId") REFERENCES "PositionType" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Job_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Job_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "RegularUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Negotiation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "userAccepted" BOOLEAN NOT NULL DEFAULT false,
    "businessAccepted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,
    "jobId" INTEGER NOT NULL,
    CONSTRAINT "Negotiation_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Negotiation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "RegularUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Interest" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "initiatedBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "jobId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    CONSTRAINT "Interest_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Interest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "RegularUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_email_key" ON "Account"("email");

-- CreateIndex
CREATE UNIQUE INDEX "RegularUser_accountId_key" ON "RegularUser"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "Business_accountId_key" ON "Business"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_accountId_key" ON "Admin"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "Qualification_regularUserId_positionTypeId_key" ON "Qualification"("regularUserId", "positionTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "Negotiation_jobId_userId_key" ON "Negotiation"("jobId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Interest_jobId_userId_initiatedBy_key" ON "Interest"("jobId", "userId", "initiatedBy");