const { Client } = require('@elastic/elasticsearch');
const { messages, users } = require('./mockData');

const client = new Client({ node: 'http://localhost:9200' });

async function run() {
  try {
    const usersIndex = 'users';
    const messagesIndex = 'messages';
    
    // 1. Khởi tạo Index users
    if (await client.indices.exists({ index: usersIndex })) {
      await client.indices.delete({ index: usersIndex });
    }
    await client.indices.create({
      index: usersIndex,
      body: {
        mappings: {
          properties: {
            id: { type: 'integer' },
            name: { type: 'search_as_you_type' },
            email: { type: 'keyword' }
          }
        }
      }
    });
    console.log('Đã tạo index users.');

    // 2. Khởi tạo Index messages
    if (await client.indices.exists({ index: messagesIndex })) {
      await client.indices.delete({ index: messagesIndex });
    }
    await client.indices.create({
      index: messagesIndex,
      body: {
        mappings: {
          properties: {
            id: { type: 'integer' },
            userId: { type: 'integer' },
            text: { type: 'search_as_you_type' },
            timestamp: { type: 'date' }
          }
        }
      }
    });
    console.log('Đã tạo index messages.');

    // 3. Insert Users
    const userOps = users.flatMap(doc => [
      { index: { _index: usersIndex, _id: doc.id.toString() } },
      doc
    ]);
    const userBulk = await client.bulk({ refresh: true, operations: userOps });
    if (userBulk.errors) console.log('Lỗi insert users', userBulk.items);
    else console.log(`Đã insert ${users.length} users.`);

    // 4. Insert Messages (Lưu ý: Không còn trường userName)
    const msgOps = messages.map(msg => ({
      id: msg.id,
      userId: msg.userId,
      text: msg.text,
      timestamp: msg.timestamp
    })).flatMap(doc => [
      { index: { _index: messagesIndex, _id: doc.id.toString() } },
      doc
    ]);
    
    const msgBulk = await client.bulk({ refresh: true, operations: msgOps });
    if (msgBulk.errors) console.log('Lỗi insert messages', msgBulk.items);
    else console.log(`Đã insert ${messages.length} messages.`);

  } catch (err) {
    console.error('Error:', err);
  }
}

run();
