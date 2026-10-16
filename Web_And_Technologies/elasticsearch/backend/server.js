const express = require('express');
const cors = require('cors');
const { Client } = require('@elastic/elasticsearch');

const app = express();
app.use(cors());
app.use(express.json());

const client = new Client({ node: 'http://localhost:9200' });

// Hàm phụ trợ lấy thông tin User từ Elasticsearch (mô phỏng gọi DB)
async function fetchUsersInfo(userIds) {
  if (!userIds || userIds.length === 0) return {};
  const result = await client.search({
    index: 'users',
    body: {
      query: { terms: { id: userIds } },
      size: 1000
    }
  });
  
  const userMap = {};
  result.hits.hits.forEach(hit => {
    userMap[hit._source.id] = hit._source;
  });
  return userMap;
}

app.get('/api/search', async (req, res) => {
  const query = req.query.q;

  try {
    let messageResult;
    let matchingUserIds = [];

    if (!query) {
      // Trả về tất cả tin nhắn
      messageResult = await client.search({
        index: 'messages',
        body: {
          query: { match_all: {} },
          sort: [{ timestamp: { order: 'asc' } }],
          size: 50
        }
      });
    } else {
      // BƯỚC 1: Tìm User khớp từ khóa
      const userSearch = await client.search({
        index: 'users',
        body: {
          query: {
            multi_match: {
              query: query,
              type: 'bool_prefix',
              fields: ['name', 'name._2gram', 'name._3gram']
            }
          }
        }
      });
      matchingUserIds = userSearch.hits.hits.map(hit => hit._source.id);

      // BƯỚC 2: Tìm Tin nhắn (khớp text HOẶC thuộc về User vừa tìm)
      const shouldClauses = [
        {
          multi_match: {
            query: query,
            type: 'bool_prefix',
            fields: ['text', 'text._2gram', 'text._3gram']
          }
        }
      ];
      if (matchingUserIds.length > 0) {
        shouldClauses.push({ terms: { userId: matchingUserIds } });
      }

      messageResult = await client.search({
        index: 'messages',
        body: {
          query: {
            bool: {
              should: shouldClauses,
              minimum_should_match: 1
            }
          },
          highlight: { fields: { text: {} } },
          sort: [{ timestamp: { order: 'asc' } }],
          size: 50
        }
      });
    }

    // BƯỚC 3: APPLICATION-SIDE JOIN
    const hitMessages = messageResult.hits.hits;
    const allUserIds = [...new Set(hitMessages.map(hit => hit._source.userId))];
    const userMap = await fetchUsersInfo(allUserIds);

    // BƯỚC 4: Ghép tên User vào tin nhắn
    const hits = hitMessages.map(hit => {
      const msgUserId = hit._source.userId;
      const userInfo = userMap[msgUserId] || { name: 'Unknown' };
      return {
        id: hit._id,
        score: hit._score,
        ...hit._source,
        userName: userInfo.name, // Ghép tên thực tế vào lúc runtime
        highlight: hit.highlight
      };
    });

    res.json({ total: messageResult.hits.total.value, results: hits });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// CẬP NHẬT TÊN USER
app.put('/api/users/:id', async (req, res) => {
  try {
    await client.update({
      index: 'users',
      id: req.params.id,
      refresh: true,
      body: { doc: { name: req.body.name } }
    });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error' });
  }
});

// CẬP NHẬT MESSAGE
app.put('/api/messages/:id', async (req, res) => {
  try {
    await client.update({
      index: 'messages',
      id: req.params.id,
      refresh: true,
      body: { doc: { text: req.body.text } }
    });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error' });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
