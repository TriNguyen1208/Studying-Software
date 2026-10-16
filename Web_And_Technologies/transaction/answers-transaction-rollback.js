/**
 * ĐÁP ÁN BÀI TẬP THỰC HÀNH TRANSACTION
 * ---------------------------------------------------------
 */

// ============================================================================
// ĐÁP ÁN THỬ THÁCH 1: MONGODB
// Cố ý làm sai ở thao tác 2 và kiểm tra dữ liệu thao tác 1
// ============================================================================
const mongoose = require('mongoose');

async function answerMongoChallenge() {
    console.log("--- Bắt đầu Đáp án Mongo ---");
    await mongoose.connect("mongodb://localhost:27017/my_nosql_db?replicaSet=rs0");

    const Account = mongoose.models.Account || mongoose.model('Account', new mongoose.Schema({ name: String, balance: Number }));
    
    // Khởi tạo dữ liệu ban đầu
    await Account.deleteMany({});
    await Account.create({ name: 'userA', balance: 500 });

    const session = await mongoose.startSession();

    try {
        await session.withTransaction(async () => {
            // Thao tác 1: Trừ tiền (THÀNH CÔNG)
            await Account.updateOne({ name: 'userA' }, { $inc: { balance: -100 } }, { session });
            console.log("1. Đã trừ 100 của userA trong transaction.");

            // Thử đọc dữ liệu TRONG transaction (Sẽ thấy balance là 400)
            const userInTx = await Account.findOne({ name: 'userA' }).session(session);
            console.log(`- Balance của userA (Bên trong Transaction): ${userInTx.balance}`);

            // Thao tác 2: Cố tình throw Error để làm sai
            console.log("2. Cố tình gây lỗi để transaction bị Rollback...");
            throw new Error("Lỗi giả lập ở bước 2");
        });
    } catch (e) {
        console.log(`=> Đã xảy ra lỗi và tự động Rollback: ${e.message}`);
    } finally {
        session.endSession();
        
        // Kiểm tra lại dữ liệu bên NGOÀI transaction sau khi bị Rollback
        // Kết quả sẽ giữ nguyên là 500 (chứng tỏ thao tác 1 đã bị hủy)
        const userAfterTx = await Account.findOne({ name: 'userA' });
        console.log(`=> Balance của userA (Sau Transaction): ${userAfterTx.balance}`);
        
        await mongoose.disconnect();
    }
}


// ============================================================================
// ĐÁP ÁN THỬ THÁCH 2: POSTGRESQL
// Quan sát hiện tượng "Block" khi delay transaction 10 giây
// ============================================================================
const { Pool } = require('pg');

async function answerPostgresChallenge() {
    const pool = new Pool({ connectionString: 'postgresql://username:password@localhost:5432/mydb' });
    
    // Client 1 đóng vai trò thực hiện transaction bị delay
    const client1 = await pool.connect();
    
    // Client 2 đóng vai trò người ngoài muốn đọc dữ liệu
    const client2 = await pool.connect();

    console.log("\n--- Bắt đầu Đáp án Postgres ---");

    try {
        // --- CLIENT 1 BẮT ĐẦU TRANSACTION ---
        await client1.query('BEGIN');
        console.log("[Client 1] Đã bắt đầu Transaction và chuẩn bị UPDATE...");
        
        // Update dữ liệu
        await client1.query(`UPDATE accounts SET balance = balance - 50 WHERE id = 1`);
        console.log("[Client 1] Đã UPDATE dữ liệu. Bắt đầu delay 5 giây trước khi COMMIT...");

        // --- CLIENT 2 CỐ GẮNG ĐỌC DỮ LIỆU CÙNG LÚC ĐÓ ---
        // Tại sao lại đọc ra giá trị cũ? Vì Postgres mặc định mức cách ly (Isolation)
        // là "Read Committed", nghĩa là chỉ đọc những gì ĐÃ COMMIT. Do client 1 chưa commit,
        // client 2 không thấy bản cập nhật mới.
        const res = await client2.query(`SELECT balance FROM accounts WHERE id = 1`);
        console.log(`[Client 2] Đọc dữ liệu LÚC CLIENT 1 ĐANG PENDING: balance = ${res.rows[0].balance} (Dữ liệu cũ, chưa đổi)`);

        // Mô phỏng delay (Chờ 5 giây)
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Nếu client 2 cố gắng UPDATE cùng dòng mà client 1 đang khóa, 
        // client 2 sẽ bị treo (block) hoàn toàn cho đến khi client 1 COMMIT/ROLLBACK.
        // Bạn có thể thử uncomment dòng dưới để xem client 2 bị treo:
        // const updatePromise = client2.query(`UPDATE accounts SET balance = balance - 10 WHERE id = 1`);

        // Client 1 Commit
        await client1.query('COMMIT');
        console.log("[Client 1] Đã COMMIT thành công!");

        // Đọc lại sau khi đã commit
        const resAfter = await client2.query(`SELECT balance FROM accounts WHERE id = 1`);
        console.log(`[Client 2] Đọc dữ liệu SAU KHI CLIENT 1 COMMIT: balance = ${resAfter.rows[0].balance} (Dữ liệu mới)`);

    } catch (e) {
        await client1.query('ROLLBACK');
        console.error(e);
    } finally {
        client1.release();
        client2.release();
        await pool.end();
    }
}

// Chạy đáp án
// answerMongoChallenge();
// answerPostgresChallenge();
