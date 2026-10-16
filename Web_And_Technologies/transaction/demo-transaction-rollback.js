/**
 * DEMO: Hướng dẫn chi tiết cách thực hiện Transaction Rollback 
 * trong PostgreSQL và MongoDB.
 * 
 * Lưu ý: Code này mô phỏng luồng xử lý. Để chạy thực tế, bạn cần cài đặt
 * thư viện `pg`, `mongodb`, `mongoose` đồng thời cấu hình chuỗi kết nối hợp lệ.
 */

// ============================================================================
// PHẦN 1: POSTGRESQL TRANSACTION (Sử dụng thư viện 'pg')
// ============================================================================
const { Pool } = require('pg');

async function postgresTransactionDemo() {
    console.log("--- Bắt đầu Demo PostgreSQL Transaction ---");
    
    // 1. Khởi tạo Pool kết nối tới PostgreSQL
    const pool = new Pool({
        connectionString: 'postgresql://username:password@localhost:5432/mydb'
    });

    // 2. Lấy một client (kết nối) riêng biệt từ pool để đảm bảo 
    // tất cả câu query trong transaction chạy trên cùng một session.
    const client = await pool.connect();

    try {
        // 3. BẮT ĐẦU TRANSACTION: Báo cho Postgres biết các thao tác 
        // tiếp theo là một khối thống nhất.
        await client.query('BEGIN');
        console.log("[Postgres] Đã chạy lệnh BEGIN");

        // 4. Thao tác 1: Trừ tiền của tài khoản A
        // Lưu ý: Chúng ta dùng client.query thay vì pool.query!
        const updateAccountA = `UPDATE accounts SET balance = balance - 100 WHERE id = 1 RETURNING *`;
        await client.query(updateAccountA);
        console.log("[Postgres] Đã trừ 100k từ tài khoản A");

        // 5. Thao tác 2: Cộng tiền cho tài khoản B
        const updateAccountB = `UPDATE accounts SET balance = balance + 100 WHERE id = 2 RETURNING *`;
        await client.query(updateAccountB);
        console.log("[Postgres] Đã cộng 100k cho tài khoản B");

        // Mô phỏng một lỗi bất ngờ xảy ra ở bước 3 (VD: Ghi log lịch sử thất bại)
        throw new Error("Lỗi mạng bất ngờ khi ghi lịch sử giao dịch!");

        // Nếu không có lỗi, chúng ta sẽ gọi lệnh COMMIT để lưu vĩnh viễn dữ liệu
        // await client.query('COMMIT');

    } catch (error) {
        // 6. XỬ LÝ LỖI (ROLLBACK): Nếu có bất kỳ lỗi nào văng ra trong khối try,
        // chúng ta lập tức phát lệnh ROLLBACK.
        // Postgres sẽ hủy bỏ mọi cập nhật từ lúc gọi lệnh BEGIN.
        console.error(`[Postgres] Đã xảy ra lỗi: ${error.message}`);
        
        await client.query('ROLLBACK');
        console.log("[Postgres] Lệnh ROLLBACK đã được gọi. Tiền tài khoản A và B được hoàn lại như cũ.");
    } finally {
        // 7. Giải phóng client trả lại cho Pool để các request khác có thể dùng.
        // Bước này rất quan trọng, nếu quên sẽ gây tràn bộ nhớ (connection leak).
        client.release();
        await pool.end(); // Đóng hoàn toàn pool (trong app thực tế thường giữ pool chạy liên tục)
    }
}


// ============================================================================
// PHẦN 2: MONGODB TRANSACTION (Sử dụng thư viện Native 'mongodb')
// ============================================================================
const { MongoClient } = require('mongodb');

async function mongoTransactionDemo() {
    console.log("\n--- Bắt đầu Demo MongoDB Transaction (Native Driver) ---");
    console.log("Chú ý: MongoDB Transaction bắt buộc phải chạy trên môi trường Replica Set hoặc Sharded Cluster!");

    // 1. Khởi tạo kết nối tới MongoDB
    const uri = "mongodb://localhost:27017,localhost:27018,localhost:27019/?replicaSet=rs0";
    const mongoClient = new MongoClient(uri);

    try {
        await mongoClient.connect();
        const db = mongoClient.db("my_nosql_db");
        const accountsCollection = db.collection("accounts");
        const logsCollection = db.collection("transaction_logs");

        // 2. KHỞI TẠO SESSION: Transaction trong Mongo bị ràng buộc vào một Session cụ thể.
        const session = mongoClient.startSession();

        try {
            // 3. BẮT ĐẦU TRANSACTION trên session vừa tạo
            session.startTransaction();
            console.log("[Mongo Native] Đã bắt đầu Transaction (startTransaction)");

            // 4. Thao tác 1: Trừ tiền tài khoản A
            // Quan trọng: Phải truyền object { session } vào các hàm query!
            await accountsCollection.updateOne(
                { _id: "userA" },
                { $inc: { balance: -100 } },
                { session } 
            );
            console.log("[Mongo Native] Đã trừ 100k tài khoản A");

            // 5. Thao tác 2: Ghi log giao dịch sang một Collection khác
            await logsCollection.insertOne(
                { action: "transfer", from: "userA", to: "userB", amount: 100, date: new Date() },
                { session }
            );
            console.log("[Mongo Native] Đã ghi log giao dịch");

            // Giả lập lỗi: Không tìm thấy tài khoản B hoặc lỗi server
            throw new Error("Tài khoản B đã bị khóa, không thể cộng tiền!");

            // Nếu mọi thứ ổn định, ta gọi commitTransaction()
            // await session.commitTransaction();

        } catch (error) {
            // 6. XỬ LÝ LỖI (ROLLBACK):
            // Gọi abortTransaction để hủy tất cả những thao tác đã thực hiện cùng chung "session"
            console.error(`[Mongo Native] Xảy ra lỗi: ${error.message}`);
            
            await session.abortTransaction();
            console.log("[Mongo Native] Lệnh abortTransaction() được thực thi. Dữ liệu tài khoản A và Log đã bị hủy.");
        } finally {
            // 7. Kết thúc Session: Luôn phải đóng session để giải phóng tài nguyên server.
            await session.endSession();
            console.log("[Mongo Native] Đã đóng Session.");
        }
    } catch (e) {
        console.error("[Mongo Native] Lỗi kết nối:", e.message);
    } finally {
        await mongoClient.close(); // Đóng kết nối
    }
}


// ============================================================================
// PHẦN 3: MONGODB TRANSACTION (Sử dụng thư viện 'mongoose' - Rất phổ biến)
// ============================================================================
const mongoose = require('mongoose');

async function mongooseTransactionDemo() {
    console.log("\n--- Bắt đầu Demo MongoDB Transaction (Mongoose) ---");
    
    // 1. Kết nối Mongoose
    const uri = "mongodb://localhost:27017/my_nosql_db?replicaSet=rs0";
    await mongoose.connect(uri);

    // 2. Định nghĩa Schema cơ bản để test
    const Account = mongoose.models.Account || mongoose.model('Account', new mongoose.Schema({ name: String, balance: Number }));
    const Log = mongoose.models.Log || mongoose.model('Log', new mongoose.Schema({ action: String, amount: Number }));

    // 3. Khởi tạo Session từ connection hiện tại
    const session = await mongoose.startSession();

    try {
        // 4. Mongoose cung cấp hàm withTransaction cực kỳ tiện lợi!
        // Hàm này tự động gọi startTransaction() và tự động commit/abort.
        // Nếu trong callback ném ra lỗi (throw Error), nó tự động gọi abortTransaction().
        await session.withTransaction(async () => {
            console.log("[Mongoose] Đã tự động startTransaction");

            // Thao tác 1: Trừ tiền (BẮT BUỘC CHÈN { session } VÀO TÙY CHỌN)
            await Account.updateOne(
                { name: 'userA' }, 
                { $inc: { balance: -100 } }, 
                { session }
            );
            console.log("[Mongoose] Đã cập nhật Account");

            // Thao tác 2: Ghi Log
            // Đối với hàm tạo mới mảng (create), Mongoose nhận mảng data là tham số đầu, session nằm trong mảng options thứ 2
            await Log.create(
                [{ action: 'transfer', amount: 100 }], 
                { session }
            );
            console.log("[Mongoose] Đã tạo Log");

            // Giả lập lỗi: 
            throw new Error("Có biến! Hủy gấp giao dịch!");
            
            // Không cần gọi commitTransaction, withTransaction sẽ tự làm nếu không có lỗi nào văng ra.
        });

    } catch (error) {
        // Lỗi từ bên trong khối withTransaction sẽ văng ra tới đây,
        // và Mongoose ĐÃ TỰ ĐỘNG GỌI abortTransaction() (ROLLBACK) rồi!
        console.error(`[Mongoose] Giao dịch thất bại và đã tự động ROLLBACK. Lý do: ${error.message}`);
    } finally {
        // Cuối cùng vẫn phải kết thúc session
        session.endSession();
        console.log("[Mongoose] Đã đóng Session.");
        await mongoose.disconnect();
    }
}

// Chạy các hàm demo
// postgresTransactionDemo();
// mongoTransactionDemo();
// mongooseTransactionDemo();
