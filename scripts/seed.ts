import 'reflect-metadata';
import { v4 as uuidv4 } from 'uuid';
import { AppDataSource } from '../src/config/data-source';
import { User, UserStatus, Transaction, TransactionType, ApiKey, ApiKeyRole } from '../src/entities';
import { hashApiKey } from '../src/middleware/auth';

const firstNames = [
  'Alex', 'Jordan', 'Casey', 'Morgan', 'Taylor', 'Riley', 'Quinn', 'Avery',
  'Cameron', 'Dakota', 'Skyler', 'Reese', 'Finley', 'Parker', 'Rowan', 'Sage',
  'Blake', 'Drew', 'Emery', 'Hayden', 'Jamie', 'Kendall', 'Lane', 'Micah',
  'Peyton', 'River', 'Sawyer', 'Tatum', 'Ashton', 'Bailey', 'Charlie', 'Devon',
  'Eden', 'Flynn', 'Gray', 'Harper', 'Indigo', 'Jesse', 'Kai', 'Logan',
  'Madison', 'Nico', 'Ocean', 'Phoenix', 'Reagan', 'Shawn', 'Tristan', 'Val',
];

const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
  'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
];

const transactionDescriptions = [
  'Welcome bonus',
  'Deposit via card',
  'Slot machine win',
  'Blackjack payout',
  'Poker tournament win',
  'Roulette bet',
  'Sports bet',
  'Withdrawal to bank',
  'Referral bonus',
  'Loyalty reward',
  'Cashback bonus',
  'Weekly promotion',
  'VIP reward',
  'Game bonus round',
  'Manual adjustment',
];

function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomCents(minDollars: number, maxDollars: number): number {
  return Math.floor(Math.random() * (maxDollars - minDollars) * 100) + minDollars * 100;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateUsername(firstName: string, lastName: string, index: number): string {
  const suffixes = ['', String(randomInt(1, 999)), '_' + randomInt(1, 99)];
  const base = `${firstName.toLowerCase()}${lastName.toLowerCase()}`;
  return `${base}${randomElement(suffixes)}${index}`;
}

function randomDate(daysBack: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - randomInt(0, daysBack));
  date.setHours(randomInt(0, 23), randomInt(0, 59), randomInt(0, 59));
  return date;
}

async function seed() {
  console.log('Connecting to database...');
  await AppDataSource.initialize();
  console.log('Database connected successfully');

  const userRepository = AppDataSource.getRepository(User);
  const transactionRepository = AppDataSource.getRepository(Transaction);
  const apiKeyRepository = AppDataSource.getRepository(ApiKey);

  console.log('Clearing existing data...');
  await transactionRepository.delete({});
  await userRepository.delete({});
  await apiKeyRepository.delete({});

  console.log('Creating API keys...');
  const adminApiKey = 'admin-secret-key';
  const serviceApiKey = 'service-secret-key';

  const adminKeyHash = hashApiKey(adminApiKey);
  const serviceKeyHash = hashApiKey(serviceApiKey);

  await apiKeyRepository.save([
    {
      name: 'Admin Key',
      keyHash: adminKeyHash,
      role: ApiKeyRole.ADMIN,
      isActive: true,
    },
    {
      name: 'Service Key',
      keyHash: serviceKeyHash,
      role: ApiKeyRole.SERVICE,
      isActive: true,
    },
  ]);

  console.log('API Keys created:');
  console.log(`  Admin API Key: ${adminApiKey}`);
  console.log(`  Service API Key: ${serviceApiKey}`);

  console.log('Creating users...');
  const users: User[] = [];
  const usedUsernames = new Set<string>();

  for (let i = 0; i < 120; i++) {
    const firstName = randomElement(firstNames);
    const lastName = randomElement(lastNames);
    let username = generateUsername(firstName, lastName, i);

    while (usedUsernames.has(username)) {
      username = generateUsername(firstName, lastName, i + randomInt(100, 999));
    }
    usedUsernames.add(username);

    const user = userRepository.create({
      username,
      email: `${username}@example.com`,
      balance: 0,
      status: randomElement([
        UserStatus.ACTIVE,
        UserStatus.ACTIVE,
        UserStatus.ACTIVE,
        UserStatus.ACTIVE,
        UserStatus.INACTIVE,
        UserStatus.SUSPENDED,
      ]),
      createdAt: randomDate(365),
    });

    users.push(user);
  }

  await userRepository.save(users);
  console.log(`Created ${users.length} users`);

  console.log('Creating transactions...');
  const allTransactions: Transaction[] = [];

  for (const user of users) {
    const numTransactions = randomInt(10, 50);
    let balance = 0;

    const initialDeposit = randomCents(100, 5000);
    balance += initialDeposit;

    const initialTx = transactionRepository.create({
      id: uuidv4(),
      userId: user.id,
      type: TransactionType.CREDIT,
      amount: initialDeposit,
      balanceAfter: balance,
      description: 'Initial deposit',
      createdAt: new Date(user.createdAt.getTime() + 1000),
    });
    allTransactions.push(initialTx);

    for (let j = 0; j < numTransactions - 1; j++) {
      const type = randomElement([
        TransactionType.CREDIT,
        TransactionType.CREDIT,
        TransactionType.DEBIT,
      ]);

      let amount: number;

      if (type === TransactionType.CREDIT) {
        amount = randomCents(10, 1000);
        balance += amount;
      } else {
        const maxDebit = Math.min(Math.floor(balance * 0.8), 50000);
        if (maxDebit < 100) continue;
        amount = randomInt(100, maxDebit);
        balance -= amount;
      }

      const transaction = transactionRepository.create({
        id: uuidv4(),
        userId: user.id,
        type,
        amount,
        balanceAfter: balance,
        description: randomElement(transactionDescriptions),
        idempotencyKey: Math.random() > 0.7 ? uuidv4() : null,
        createdAt: randomDate(
          Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24))
        ),
      });

      allTransactions.push(transaction);
    }

    user.balance = balance;
  }

  const batchSize = 500;
  for (let i = 0; i < allTransactions.length; i += batchSize) {
    const batch = allTransactions.slice(i, i + batchSize);
    await transactionRepository.save(batch);
    console.log(
      `Saved ${Math.min(i + batchSize, allTransactions.length)}/${
        allTransactions.length
      } transactions`
    );
  }

  await userRepository.save(users);

  console.log(`Created ${allTransactions.length} transactions`);

  const totalUsers = await userRepository.count();
  const totalTransactions = await transactionRepository.count();
  const avgBalanceCents = users.reduce((sum, u) => sum + u.balance, 0) / users.length;

  console.log('\n--- Seed Summary ---');
  console.log(`Total users: ${totalUsers}`);
  console.log(`Total transactions: ${totalTransactions}`);
  console.log(`Average user balance: $${(avgBalanceCents / 100).toFixed(2)} (${Math.round(avgBalanceCents)} cents)`);
  console.log(`Active users: ${users.filter((u) => u.status === UserStatus.ACTIVE).length}`);
  console.log(`Inactive users: ${users.filter((u) => u.status === UserStatus.INACTIVE).length}`);
  console.log(`Suspended users: ${users.filter((u) => u.status === UserStatus.SUSPENDED).length}`);

  console.log('\n--- API Keys ---');
  console.log('Use these keys in the X-API-Key header:');
  console.log(`  Admin: ${adminApiKey}`);
  console.log(`  Service: ${serviceApiKey}`);

  await AppDataSource.destroy();
  console.log('\nSeeding completed successfully!');
}

seed().catch((error) => {
  console.error('Seeding failed:', error);
  process.exit(1);
});
