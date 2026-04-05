/*
 * Complete this script so that it is able to add a superuser to the database
 * Usage example: 
 *   node prisma/createsu.js clive123 clive.su@mail.utoronto.ca SuperUser123!
 */
'use strict';

const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const [utorid, email, password] = process.argv.slice(2);
  if (!utorid || !email || !password) {
    console.error('Usage: node prisma/createsu.js <utorid> <email> <password>');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const account = await prisma.account.create({
    data: {
      email,
      passwordHash,
      role: 'admin',
      activated: true,
    },
  });

  await prisma.admin.create({
    data: {
      accountId: account.id,
      utorid,
    },
  });

  console.log(`Admin created: ${email} (account id ${account.id})`);
}

main()
  .catch((e) => {
    if (e.code === 'P2002') { //P2002 is the error code for email alrd exists
      console.error('An account with that email already exists.');
    } else {
      console.error(e);
    }
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());