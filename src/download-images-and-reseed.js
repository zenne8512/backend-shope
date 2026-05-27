/**
 * Script tải ảnh về server và re-seed database với URL cục bộ
 * Chạy: node src/download-images-and-reseed.js
 */
const { PrismaClient } = require('@prisma/client');
const https = require('https');
const http  = require('http');
const fs    = require('fs');
const path  = require('path');

const prisma = new PrismaClient();
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

// ─── Helper: tải ảnh về local ─────────────────────────────────────────────
function downloadImage(url, filename) {
    return new Promise((resolve, reject) => {
        const dest = path.join(UPLOAD_DIR, filename);
        if (fs.existsSync(dest)) { resolve(filename); return; } // đã có rồi

        const file = fs.createWriteStream(dest);
        const mod  = url.startsWith('https') ? https : http;

        function doGet(u) {
            mod.get(u, (res) => {
                if (res.statusCode === 301 || res.statusCode === 302) {
                    doGet(res.headers.location);
                    return;
                }
                if (res.statusCode !== 200) {
                    file.close();
                    fs.unlink(dest, () => {});
                    reject(new Error(`HTTP ${res.statusCode} cho ${url}`));
                    return;
                }
                res.pipe(file);
                file.on('finish', () => { file.close(); resolve(filename); });
            }).on('error', (e) => {
                file.close();
                fs.unlink(dest, () => {});
                reject(e);
            });
        }
        doGet(url);
    });
}

// ─── Danh sách ảnh cần tải ────────────────────────────────────────────────
const IMAGE_MAP = {
    'skincare1.jpg'   : 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=600&q=85&auto=format&fit=crop',
    'skincare2.jpg'   : 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&q=85&auto=format&fit=crop',
    'skincare3.jpg'   : 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=600&q=85&auto=format&fit=crop',
    'skincare4.jpg'   : 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&q=85&auto=format&fit=crop',
    'serum.jpg'       : 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&q=85&auto=format&fit=crop',
    'sunscreen.jpg'   : 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=600&q=85&auto=format&fit=crop',
    'toner.jpg'       : 'https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?w=600&q=85&auto=format&fit=crop',
    'mask.jpg'        : 'https://images.unsplash.com/photo-1577493340887-b7bfff550145?w=600&q=85&auto=format&fit=crop',
    'bodywash.jpg'    : 'https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?w=600&q=85&auto=format&fit=crop',
    'deodorant.jpg'   : 'https://images.unsplash.com/photo-1612817288484-6f916006741a?w=600&q=85&auto=format&fit=crop',
    'soap.jpg'        : 'https://images.unsplash.com/photo-1607006342445-5606b3004724?w=600&q=85&auto=format&fit=crop',
    'lotion.jpg'      : 'https://images.unsplash.com/photo-1573461160327-f8f89a5f23be?w=600&q=85&auto=format&fit=crop',
    'scrub.jpg'       : 'https://images.unsplash.com/photo-1619451334792-150fd785ee74?w=600&q=85&auto=format&fit=crop',
    'hairwax.jpg'     : 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=600&q=85&auto=format&fit=crop',
    'shampoo.jpg'     : 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=600&q=85&auto=format&fit=crop',
    'hairoil.jpg'     : 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=600&q=85&auto=format&fit=crop',
    'shave.jpg'       : 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600&q=85&auto=format&fit=crop',
    'aftershave.jpg'  : 'https://images.unsplash.com/photo-1585830812416-a6c869e452b9?w=600&q=85&auto=format&fit=crop',
    'beardoil.jpg'    : 'https://images.unsplash.com/photo-1626015570026-606b5c3ebb7d?w=600&q=85&auto=format&fit=crop',
    'perfume1.jpg'    : 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=600&q=85&auto=format&fit=crop',
    'perfume2.jpg'    : 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=600&q=85&auto=format&fit=crop',
    'perfume3.jpg'    : 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=600&q=85&auto=format&fit=crop',
    'perfume4.jpg'    : 'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=600&q=85&auto=format&fit=crop',
    'lipbalm.jpg'     : 'https://images.unsplash.com/photo-1625772452859-1c03d5bf1137?w=600&q=85&auto=format&fit=crop',
    'concealer.jpg'   : 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&q=85&auto=format&fit=crop',
    'bbcream.jpg'     : 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=600&q=85&auto=format&fit=crop',
};

// ─── Ánh xạ tên file → URL local ─────────────────────────────────────────
const L = (f) => `/uploads/${f}`;

// ─── Dữ liệu sản phẩm với ảnh local ─────────────────────────────────────
const productsData = [
    // SKINCARE
    { name:'Kem Chống Nắng La Roche-Posay Anthelios SPF50+ 50ml',slug:'kem-chong-nang-la-roche-posay-anthelios',description:'Dòng kem chống nắng kiềm dầu thế hệ mới bảo vệ da toàn diện trước tia UVA/UVB. Kết cấu dạng serum mỏng nhẹ, thẩm thấu nhanh, mang lại lớp finish mịn lì không tì vết.',brand:'La Roche-Posay',category:'skincare',price:395000,stock:85,img:'sunscreen.jpg'},
    { name:'Sữa Rửa Mặt CeraVe Hydrating Cleanser 236ml',slug:'sua-rua-mat-cerave-hydrating-cleanser',description:'Sữa rửa mặt dưỡng ẩm chuyên sâu cho da thường đến da khô. Giúp làm sạch nhẹ nhàng bụi bẩn, bã nhờn mà không làm tổn hại đến hàng rào bảo vệ tự nhiên của da.',brand:'CeraVe',category:'skincare',price:220000,stock:120,img:'skincare1.jpg'},
    { name:'Tinh Chất Phục Hồi Hyaluronic Acid Serum OX 30ml',slug:'tinh-chat-phuc-hoi-hyaluronic-acid-serum-ox',description:'Serum phục hồi và cấp ẩm tức thì chứa HA đa tầng cùng Vitamin B5. Giúp làm dịu da kích ứng sau khi cạo râu, cấp ẩm sâu và giảm thô ráp cho làn da nam giới.',brand:'OXEN PROVENCE',category:'skincare',price:550000,stock:60,img:'serum.jpg'},
    { name:"Kem Dưỡng Ẩm Jack Black Double-Duty Face Moisturizer SPF20",slug:'kem-duong-am-jack-black-double-duty',description:'Kem dưỡng ẩm tích hợp chống nắng hàng ngày dành cho nam giới. Cấp ẩm sâu, chống oxy hóa mạnh mẽ và bảo vệ da khỏi tác hại của tia UV.',brand:'Jack Black',category:'skincare',price:720000,stock:45,img:'skincare2.jpg'},
    { name:"Sữa Rửa Mặt Kiềm Dầu Kiehl's Ultra Facial Oil-Free Cleanser",slug:'sua-rua-mat-kiem-dau-kiehls-ultra-facial',description:'Sữa rửa mặt tạo bọt mỏng nhẹ giúp loại bỏ triệt để bã nhờn dư thừa và tạp chất mà không gây khô da. Chiết xuất từ cỏ tranh và chanh giúp làm sạch sâu lỗ chân lông.',brand:"Kiehl's",category:'skincare',price:680000,stock:50,img:'skincare3.jpg'},
    { name:"Kem Dưỡng Da Sáng Khỏe L'Oreal Men Expert Hydra Energetic",slug:'kem-duong-da-loreal-men-expert-hydra',description:'Kem dưỡng bổ sung Vitamin C và Caffeine giúp đẩy lùi 5 dấu hiệu mệt mỏi của làn da nam giới, mang lại vẻ rạng rỡ, săn chắc và sảng khoái suốt 24 giờ.',brand:"L'Oreal Men Expert",category:'skincare',price:340000,stock:90,img:'skincare4.jpg'},
    { name:'Tẩy Tế Bào Chết Mặt Bulldog Original Face Scrub 125ml',slug:'tay-te-bao-chet-mat-bulldog-original',description:'Sản phẩm chứa hạt yến mạch nghiền mịn và hạt quả mơ giúp loại bỏ tế bào chết dịu nhẹ, kích thích tái tạo da mới, mang lại làn da mịn màng, thông thoáng.',brand:'Bulldog',category:'skincare',price:215000,stock:75,img:'skincare2.jpg'},
    { name:'Mặt Nạ Đất Sét Tràm Trà OX Men Clay Mask 100g',slug:'mat-na-dat-set-tram-tra-ox-men',description:'Mặt nạ đất sét hấp thụ dầu thừa độc tố và se khít lỗ chân lông hiệu quả. Tinh chất tràm trà giúp kháng viêm, ngăn ngừa mụn tối đa cho nam giới.',brand:'OXEN PROVENCE',category:'skincare',price:320000,stock:40,img:'mask.jpg'},
    { name:'Nước Hoa Hồng Kiềm Dầu Nivea Men Oil Control Toner',slug:'nuoc-hoa-hong-nivea-men-oil-control',description:'Toner kiềm dầu chuyên sâu giúp cân bằng độ ẩm sau khi rửa mặt. Công thức chứa khoáng chất biển sâu hỗ trợ thu nhỏ lỗ chân lông và ngăn bóng dầu suốt 8 giờ.',brand:'Nivea Men',category:'skincare',price:135000,stock:110,img:'toner.jpg'},
    // BODY & BATH
    { name:'Sữa Tắm Hương Nước Hoa Romano Classic 650g',slug:'sua-tam-romano-classic-650g',description:'Sữa tắm nam hương Classic sang trọng lịch lãm. Sự kết hợp giữa Patchouli ấm áp và Sandalwood trầm ấm giúp lưu giữ hương thơm nam tính quyến rũ suốt cả ngày dài.',brand:'Romano',category:'body-bath',price:185000,stock:150,img:'bodywash.jpg'},
    { name:'Sữa Tắm Trị Mụn Lưng OX Body Wash For Men 400ml',slug:'sua-tam-tri-mun-lung-ox-body-wash',description:'Sữa tắm chứa thành phần Salicylic Acid (BHA) giúp làm sạch sâu lỗ chân lông, ngăn ngừa mụn lưng và ngực. Chiết xuất lô hội giúp da mịn màng, ẩm mượt.',brand:'OXEN PROVENCE',category:'body-bath',price:290000,stock:80,img:'bodywash.jpg'},
    { name:'Lăn Khử Mùi Jack Black Pit Boss Deodorant',slug:'lan-khu-mui-jack-black-pit-boss',description:'Lăn khử mùi cao cấp kiểm soát mồ hôi hiệu quả mà không gây kích ứng da. Hương thơm nam tính nhẹ nhàng, không để lại vệt ố vàng trên áo quần.',brand:'Jack Black',category:'body-bath',price:490000,stock:65,img:'deodorant.jpg'},
    { name:'Xà Phòng Tắm Than Hoạt Tính Bulldog Original Bar Soap',slug:'xa-phong-tam-than-hoat-tinh-bulldog',description:'Xà phòng tắm thủ công chiết xuất từ than tre hoạt tính và tinh dầu tự nhiên. Hút sạch bụi bẩn, độc tố trên bề mặt da, mang lại cảm giác sảng khoái tối đa.',brand:'Bulldog',category:'body-bath',price:155000,stock:200,img:'soap.jpg'},
    { name:'Sữa Tắm Gội 3-in-1 Nivea Men Active Clean Carbon 500ml',slug:'sua-tam-goi-3-in-1-nivea-men-active',description:'Sự kết hợp tiện lợi 3 chức năng: Tắm toàn thân, gội đầu và rửa mặt trong một chai duy nhất. Chứa Carbon hoạt tính hút sạch dầu thừa và bã nhờn.',brand:'Nivea Men',category:'body-bath',price:160000,stock:140,img:'shampoo.jpg'},
    { name:'Kem Dưỡng Thể Cấp Ẩm Sâu OX Deep Moisture Lotion 250ml',slug:'kem-duong-the-cap-am-sau-ox-deep',description:'Dưỡng thể cấp ẩm chuyên sâu cho nam giới với kết cấu lỏng mịn thấm cực nhanh. Nuôi dưỡng làn da khô ráp, đem lại cảm giác mịn màng khỏe mạnh tức thì.',brand:'OXEN PROVENCE',category:'body-bath',price:360000,stock:70,img:'lotion.jpg'},
    { name:'Muối Tắm Tẩy Tế Bào Chết Cà Phê OX Body Scrub 200g',slug:'muoi-tam-tay-te-bao-chet-ca-phe-ox',description:'Tẩy tế bào chết cơ thể với các hạt cà phê Robusta xay mịn hòa quyện tinh dầu dừa tự nhiên. Đánh bay lớp sừng thô ráp, làm sáng và săn chắc làn da.',brand:'OXEN PROVENCE',category:'body-bath',price:240000,stock:95,img:'scrub.jpg'},
    { name:'Xịt Khử Mùi Toàn Thân Axe Gold Temptation 150ml',slug:'xit-khu-mui-toan-than-axe-gold',description:'Xịt khử mùi toàn thân với sự kết hợp tinh tế giữa hương gỗ trầm ấm và vani ngọt ngào. Khóa mùi mồ hôi suốt 48 giờ, giúp bạn tự tin khẳng định đẳng cấp.',brand:'Axe',category:'body-bath',price:115000,stock:180,img:'deodorant.jpg'},
    // HAIR
    { name:'Sáp Vuốt Tóc Clay Pomade OX Strong Hold 100g',slug:'sap-vuot-toc-clay-pomade-ox-strong',description:'Sáp vuốt tóc nam với độ giữ nếp cực cao (Strong Hold) và độ bóng mờ tự nhiên (Matte Finish). Thích hợp cho các kiểu tóc hiện đại như Undercut, Pompadour.',brand:'OXEN PROVENCE',category:'hair',price:320000,stock:110,img:'hairwax.jpg'},
    { name:'Gôm Xịt Tóc Lock & Hold Hair Spray 400ml',slug:'gom-xit-toc-lock-hold-hair-spray',description:'Gôm xịt tóc tạo kiểu nhanh, khô tức thì và khóa nếp tóc suốt 24 giờ. Công thức chứa dưỡng chất bảo vệ tóc trước tác động nhiệt của máy sấy.',brand:'OXEN PROVENCE',category:'hair',price:210000,stock:130,img:'hairwax.jpg'},
    { name:'Dầu Gội Sạch Sâu Daily Cleanse OX Men Shampoo 500ml',slug:'dau-goi-sach-sau-daily-clean-ox-men',description:'Dầu gội làm sạch bã nhờn, gàu và sáp vuốt tóc tích tụ chỉ sau một lần gội. Tinh chất bạc hà mát lạnh mang lại cảm giác cực kỳ sảng khoái.',brand:'OXEN PROVENCE',category:'hair',price:240000,stock:90,img:'shampoo.jpg'},
    { name:'Dầu Xả Mượt Tóc OX Hydrating Men Conditioner 500ml',slug:'dau-xa-muot-toc-ox-hydrating-men',description:'Dầu xả cấp ẩm sâu và làm mềm mượt mái tóc xơ rối của nam giới. Bổ sung Keratin củng cố cấu trúc tóc từ sâu bên trong, kích thích tóc phát triển khỏe mạnh.',brand:'OXEN PROVENCE',category:'hair',price:250000,stock:85,img:'shampoo.jpg'},
    { name:'Dầu Dưỡng Tóc Bưởi & Olive OX Hair Serum 100ml',slug:'dau-duong-toc-buoi-olive-ox-hair-serum',description:'Serum nuôi dưỡng nang tóc khỏe mạnh, ngăn ngừa rụng tóc rõ rệt. Tinh dầu bưởi tự nhiên cùng dầu olive giúp mái tóc chắc khỏe, óng mượt tự nhiên.',brand:'OXEN PROVENCE',category:'hair',price:280000,stock:75,img:'hairoil.jpg'},
    { name:'Sáp Tạo Kiểu Tóc Mờ Matte Paste OX Natural Hold',slug:'sap-tao-kieu-toc-mo-matte-paste-ox',description:'Dòng sáp dạng Paste mềm mịn, dễ tạo kiểu và điều chỉnh form tóc linh hoạt. Giữ nếp nhẹ nhàng tự nhiên, lý tưởng cho mái tóc mỏng đến trung bình.',brand:'OXEN PROVENCE',category:'hair',price:300000,stock:95,img:'hairwax.jpg'},
    { name:'Dầu Gội Trị Gàu Bạc Hà Nivea Men Cool Kick Shampoo',slug:'dau-goi-tri-gau-bac-ha-nivea-men-cool',description:'Dầu gội trị gàu tối ưu với chiết xuất bạc hà và tinh dầu tràm trà. Làm dịu da đầu ngứa, loại bỏ gàu bám dai dẳng và đem lại hương thơm mát sảng khoái.',brand:'Nivea Men',category:'hair',price:125000,stock:150,img:'shampoo.jpg'},
    { name:'Tinh Chất Mọc Tóc OX Men Hair Growth Essence 50ml',slug:'tinh-chat-moc-toc-ox-men-hair-growth',description:'Serum đặc trị hói đầu và kích thích mọc tóc thế hệ mới dành riêng cho nam giới. Chứa nồng độ cao chiết xuất nhân sâm và hà thủ ô đỏ nuôi dưỡng chân tóc.',brand:'OXEN PROVENCE',category:'hair',price:450000,stock:50,img:'serum.jpg'},
    // SHAVING
    { name:'Bọt Cạo Râu Làm Dịu Da Nivea Men Sensitive 200ml',slug:'bot-cao-rau-lam-diu-da-nivea-men',description:'Bọt cạo râu dịu nhẹ dành cho làn da nhạy cảm. Công thức chứa hoa cúc la mã giúp làm mềm râu cực nhanh, giảm thiểu ma sát tối đa tránh trầy xước da.',brand:'Nivea Men',category:'shaving-beard',price:95000,stock:140,img:'aftershave.jpg'},
    { name:'Kem Cạo Râu Jack Black Beard Lube Shave',slug:'kem-cao-rau-jack-black-beard-lube',description:'Sự tích hợp 3-in-1: Dầu dưỡng ẩm trước cạo, kem cạo râu mịn màng và kem dưỡng sau cạo râu. Chứa tinh dầu macadamia và jojoba giúp lưỡi dao lướt êm ái.',brand:'Jack Black',category:'shaving-beard',price:520000,stock:45,img:'shave.jpg'},
    { name:'Dầu Dưỡng Râu Mềm Mại Bulldog Original Beard Oil 30ml',slug:'dau-duong-rau-mem-mai-bulldog-original',description:'Dầu dưỡng râu cao cấp được chiết xuất từ nha đam, dầu jojoba và trà xanh. Giúp làm mềm râu thô ráp, cấp ẩm cho vùng da dưới râu tránh tình trạng ngứa rát.',brand:'Bulldog',category:'shaving-beard',price:245000,stock:80,img:'beardoil.jpg'},
    { name:'Gel Dưỡng Sau Cạo Râu Gillette After Shave Cool Wave',slug:'gel-duong-sau-cao-rau-gillette-after',description:'Gel dưỡng da sau cạo râu mang lại cảm giác mát lạnh tức thì, làm dịu vết mẩn đỏ và sát khuẩn da nhẹ nhàng sau khi sử dụng dao cạo.',brand:'Gillette',category:'shaving-beard',price:185000,stock:120,img:'aftershave.jpg'},
    { name:'Dao Cạo Râu Gillette Fusion 5 ProGlide Premium',slug:'dao-cao-rau-gillette-fusion-5-proglide',description:'Dòng dao cạo 5 lưỡi tân tiến nhất với công nghệ FlexBall xoay chuyển linh hoạt theo mọi đường cong khuôn mặt. Cạo sạch sâu, êm ái chưa từng có.',brand:'Gillette',category:'shaving-beard',price:350000,stock:95,img:'shave.jpg'},
    { name:'Sáp Dưỡng Râu Tạo Kiểu Bulldog Original Beard Balm 75ml',slug:'sap-duong-rau-tao-kieu-bulldog-original',description:'Sáp dưỡng râu đa năng giúp giữ nếp râu gọn gàng, định hình kiểu râu lịch lãm và cung cấp độ ẩm nuôi dưỡng sợi râu mềm mượt suốt ngày.',brand:'Bulldog',category:'shaving-beard',price:260000,stock:70,img:'beardoil.jpg'},
    { name:'Gel Cạo Râu Trong Suốt OX Clear Shaving Gel 250ml',slug:'gel-cao-rau-tao-bot-trong-suot-ox',description:'Gel cạo râu trong suốt không bọt giúp bạn dễ dàng định hình đường viền râu chính xác. Tinh dầu tràm trà giúp kháng khuẩn và làm dịu da nhanh chóng.',brand:'OXEN PROVENCE',category:'shaving-beard',price:180000,stock:110,img:'aftershave.jpg'},
    { name:'Sữa Dưỡng Làm Dịu Da Bulldog Sensitive Balm 100ml',slug:'sua-duong-lam-diu-da-bulldog-sensitive',description:'Sữa dưỡng dịu nhẹ chuyên sâu sau cạo râu cho làn da nhạy cảm. Giảm rát da lập tức, cấp ẩm nhẹ dịu mà không gây bết rít bóng nhờn.',brand:'Bulldog',category:'shaving-beard',price:220000,stock:90,img:'skincare1.jpg'},
    // FRAGRANCE
    { name:'Nước Hoa Nam Acqua Di Gio Pour Homme EDT 100ml',slug:'nuoc-hoa-nam-acqua-di-gio-pour-homme',description:'Dòng nước hoa huyền thoại dành cho nam giới với hương biển thanh khiết mát lạnh kết hợp cùng cam bergamot thanh mát và hương gỗ sồi nam tính ấm áp.',brand:'Giorgio Armani',category:'fragrance',price:2450000,stock:35,img:'perfume1.jpg'},
    { name:'Nước Hoa Nam Bleu De Chanel EDP Sang Trọng 100ml',slug:'nuoc-hoa-nam-bleu-de-chanel-edp',description:'Biểu tượng của sự nam tính sang trọng và lịch lãm tinh tế. Hương gỗ nồng nàn kết hợp cùng bưởi thanh mát và hồ tiêu cay nồng đầy quyến rũ cuốn hút.',brand:'Giorgio Armani',category:'fragrance',price:3600000,stock:20,img:'perfume4.jpg'},
    { name:'Nước Hoa Nam Sauvage Dior Cao Cấp 100ml',slug:'nuoc-hoa-nam-sauvage-dior-premium',description:'Mùi hương hoang dã, tự do đầy lôi cuốn mạnh mẽ. Sự kết hợp độc đáo giữa cam Bergamot vùng Calabria cay nồng quyến rũ và hương gỗ hổ phách ấm nồng sâu lắng.',brand:'Dior',category:'fragrance',price:3450000,stock:25,img:'perfume3.jpg'},
    { name:'Nước Hoa Nam Versace Eros Men EDT 100ml',slug:'nuoc-hoa-nam-versace-eros-men-edt',description:'Lấy cảm hứng từ vị thần tình yêu Hy Lạp cổ đại, mang mùi hương nam tính quyến rũ mạnh mẽ với hương bạc hà mát lạnh, táo xanh và đậu tonka ấm áp cuốn hút.',brand:'Versace',category:'fragrance',price:1950000,stock:30,img:'perfume2.jpg'},
    { name:'Nước Hoa Nam Romano Force Eau De Toilette 50ml',slug:'nuoc-hoa-nam-romano-force-edt-50ml',description:'Nước hoa nam Romano Force với hương thơm sảng khoái đầy năng động từ sự kết hợp của hoắc hương ấm áp và phong lữ tươi mát, khẳng định phong cách đàn ông mạnh mẽ.',brand:'Romano',category:'fragrance',price:240000,stock:120,img:'perfume1.jpg'},
    { name:'Nước Hoa Khô Bỏ Túi OX Solid Perfume Men 15g',slug:'nuoc-hoa-kho-bo-tui-ox-solid-perfume',description:'Dạng sáp nước hoa khô bỏ túi tiện lợi mang theo mọi nơi. Chiết xuất sáp ong lành tính giúp cấp ẩm da nhẹ nhàng cùng hương thơm gỗ tuyết tùng bí ẩn nam tính.',brand:'OXEN PROVENCE',category:'fragrance',price:180000,stock:150,img:'perfume2.jpg'},
    { name:'Nước Hoa Nam Bvlgari Aqva Pour Homme EDT 100ml',slug:'nuoc-hoa-nam-bvlgari-aqva-pour-homme',description:'Mùi hương đại dương xanh sâu thẳm mát lạnh đầy năng động phóng khoáng. Chứa tinh dầu quýt chín mọng, rong biển Posidonia và hương hổ phách trầm ấm đầy bản lĩnh.',brand:'Giorgio Armani',category:'fragrance',price:1850000,stock:40,img:'perfume4.jpg'},
    { name:'Tinh Dầu Nước Hoa Lăn OX Men Perfume Oil 10ml',slug:'tinh-dau-nuoc-hoa-lan-ox-men-perfume',description:'Tinh dầu nước hoa dạng lăn đậm đặc, không chứa cồn, lưu hương cực đỉnh đến 12 tiếng. Hương gỗ gụ ấm áp bí ẩn hòa quyện hổ phách quyến rũ sành điệu.',brand:'OXEN PROVENCE',category:'fragrance',price:220000,stock:160,img:'perfume3.jpg'},
    // GROOMING
    { name:'Son Dưỡng Môi Trị Thâm Nam Giới OX Men Lip Balm',slug:'son-duong-moi-tri-tham-nam-gioi-ox',description:'Son dưỡng môi không màu, không bóng dành riêng cho nam giới. Bổ sung dầu dừa và bơ hạt mỡ giúp dưỡng ẩm chuyên sâu trị khô ráp nứt nẻ và mờ thâm môi rõ rệt.',brand:'OXEN PROVENCE',category:'grooming',price:120000,stock:220,img:'lipbalm.jpg'},
    { name:'Kem Trang Điểm Nam BB Cream OX Men 3-in-1',slug:'kem-trang-diem-nam-bb-cream-ox-men',description:'Kem trang điểm BB Cream đa năng giúp che phủ lỗ chân lông to, mụn thâm và làm đều màu da nam giới vô cùng tự nhiên. Khả năng kiềm dầu kháng mồ hôi cực đỉnh.',brand:'OXEN PROVENCE',category:'grooming',price:350000,stock:80,img:'bbcream.jpg'},
    { name:'Bút Che Khuyết Điểm Nam Giới OX Men Concealer Pen',slug:'but-che-khuyet-diem-nam-gioi-ox-men',description:'Thiết kế dạng bút tiện lợi giúp nam giới nhanh chóng che giấu quầng thâm mắt mệt mỏi, đốm mụn đỏ hay sẹo thâm xấu xí trên da mặt, mang lại sự tự tin tột đỉnh.',brand:'OXEN PROVENCE',category:'grooming',price:195000,stock:130,img:'concealer.jpg'},
    { name:'Kem Chống Nắng Nâng Tông Tự Nhiên OX Tone-Up SPF50 50g',slug:'kem-chong-nang-nang-tong-tu-nhien-ox',description:'Kem chống nắng vật lý lai hóa học nâng tông da nam giới sáng khỏe tự nhiên không hề bết trắng giả tạo. Kháng nước mạnh mẽ phù hợp cho các hoạt động thể thao dã ngoại.',brand:'OXEN PROVENCE',category:'grooming',price:320000,stock:90,img:'sunscreen.jpg'},
    { name:'Chì Kẻ Mày Hai Đầu Cho Nam OX Men Eyebrow Pencil',slug:'chi-ke-may-hai-dau-cho-nam-ox-men',description:'Chì kẻ mày nam giới thiết kế 2 đầu: 1 đầu chì dẹt dễ vẽ định hình khuôn chân mày đầy đặn nam tính, 1 đầu chổi chải tơi sợi lông mày vô cùng tự nhiên quyến rũ.',brand:'OXEN PROVENCE',category:'grooming',price:150000,stock:140,img:'concealer.jpg'},
    { name:'Kem Che Lỗ Chân Lông Kiềm Dầu OX Matte Primer 30ml',slug:'kem-che-lo-chan-long-kiem-dau-ox-matte',description:'Kem lót kiềm dầu giúp san phẳng bề mặt da sần sùi lồi lõm do sẹo rỗ và se khít lỗ chân lông hoàn hảo. Giữ lớp finish mịn lì không bóng nhờn suốt cả ngày dài.',brand:'OXEN PROVENCE',category:'grooming',price:270000,stock:85,img:'serum.jpg'},
    { name:'Phấn Phủ Kiềm Dầu Không Màu OX No-Sebum Men Powder',slug:'phan-phu-kiem-dau-khong-mau-ox-no',description:'Phấn phủ bột khoáng siêu mịn không màu kiểm soát dầu bóng cực đỉnh tức thì cho nam giới. Khóa chặt lớp dầu thừa, mang lại làn da khô thoáng tự tin tuyệt đối.',brand:'OXEN PROVENCE',category:'grooming',price:210000,stock:120,img:'bbcream.jpg'},
    { name:"Nước Tẩy Trang Dịu Nhẹ Cho Nam Kiehl's Micellar Water",slug:'nuoc-tay-trang-diu-nhe-cho-nam-kiehls',description:'Nước tẩy trang chiết xuất thảo mộc lành tính làm sạch bụi mịn sâu bên trong lỗ chân lông và các lớp kem chống nắng một cách dịu nhẹ nhất không gây rát da.',brand:"Kiehl's",category:'grooming',price:490000,stock:60,img:'toner.jpg'},
    { name:'Xịt Khoáng Cấp Ẩm Nam Giới OX Men Mineral Spray 150ml',slug:'xit-khoang-cap-am-nam-gioi-ox-men-mineral',description:'Xịt khoáng chiết xuất từ nước suối khoáng nóng núi lửa Pháp làm mát da tức thì, cấp ẩm giảm mụn chống oxy hóa da hữu hiệu cho nam giới hoạt động ngoài trời.',brand:'OXEN PROVENCE',category:'grooming',price:160000,stock:190,img:'toner.jpg'},
];

async function main() {
    // ── 1. Tải ảnh về local ──
    console.log('📥 Đang tải ảnh về thư mục uploads...');
    let dlOk = 0, dlFail = 0;
    for (const [filename, url] of Object.entries(IMAGE_MAP)) {
        try {
            await downloadImage(url, filename);
            process.stdout.write(`  ✅ ${filename}\n`);
            dlOk++;
        } catch (e) {
            process.stdout.write(`  ❌ ${filename}: ${e.message}\n`);
            dlFail++;
        }
    }
    console.log(`\n📸 Tải ảnh xong: ${dlOk} thành công, ${dlFail} thất bại.\n`);

    // ── 2. Xóa dữ liệu cũ ──
    console.log('🧹 Dọn dẹp database cũ...');
    await prisma.order_items.deleteMany({});
    await prisma.cart_items.deleteMany({});
    await prisma.product_reviews.deleteMany({});
    await prisma.product_images.deleteMany({});
    await prisma.product_variants.deleteMany({});
    await prisma.product_attributes.deleteMany({});
    await prisma.products.deleteMany({});
    await prisma.brands.deleteMany({});
    await prisma.categories.deleteMany({});
    console.log('✅ Đã xóa sạch dữ liệu cũ.\n');

    // ── 3. Tạo categories ──
    const catsData = [
        { name:'Chăm sóc da mặt',slug:'skincare' },
        { name:'Chăm sóc cơ thể',slug:'body-bath' },
        { name:'Chăm sóc & Tạo kiểu tóc',slug:'hair' },
        { name:'Râu & Cạo râu',slug:'shaving-beard' },
        { name:'Nước hoa nam',slug:'fragrance' },
        { name:'Chống nắng & Trang điểm',slug:'grooming' }
    ];
    const cats = {};
    for (const c of catsData) {
        cats[c.slug] = await prisma.categories.create({ data: c });
    }

    // ── 4. Tạo brands ──
    const brandsData = [
        { name:'OXEN PROVENCE',country:'Pháp' },
        { name:'La Roche-Posay',country:'Pháp' },
        { name:'CeraVe',country:'Mỹ' },
        { name:"Kiehl's",country:'Mỹ' },
        { name:'Jack Black',country:'Mỹ' },
        { name:'Bulldog',country:'Anh' },
        { name:'Romano',country:'Singapore' },
        { name:'Nivea Men',country:'Đức' },
        { name:"L'Oreal Men Expert",country:'Pháp' },
        { name:'Gillette',country:'Mỹ' },
        { name:'Giorgio Armani',country:'Ý' },
        { name:'Dior',country:'Pháp' },
        { name:'Versace',country:'Ý' },
        { name:'Axe',country:'Mỹ' }
    ];
    const brands = {};
    for (const b of brandsData) {
        brands[b.name] = await prisma.brands.create({ data: b });
    }

    // ── 5. Insert sản phẩm ──
    console.log(`📦 Đang insert ${productsData.length} sản phẩm...`);
    const reviews = [
        'Sản phẩm dùng siêu thích, chất lượng xứng đáng giá tiền!',
        'Hương thơm nam tính dễ chịu lắm nha, kiềm dầu cực kỳ ổn áp.',
        'Đóng gói cẩn thận, giao hàng nhanh. Sẽ tiếp tục mua ủng hộ shop OX.',
        'Dùng xong thấy da cải thiện hẳn, không hề bị rát hay nổi mụn.',
        'Được bạn giới thiệu mua dùng thử mà ưng thực sự, 5 sao nhé shop!'
    ];

    for (const p of productsData) {
        const prod = await prisma.products.create({
            data: {
                name: p.name,
                slug: p.slug,
                description: p.description,
                category_id: cats[p.category].id,
                brand_id: brands[p.brand].id,
                status: 'active'
            }
        });

        await prisma.product_variants.create({
            data: { product_id: prod.id, name: 'Mặc định', price: p.price, stock: p.stock, sku: `SKU-${prod.id}` }
        });

        // ← URL ảnh local thay vì Unsplash
        const localUrl = L(p.img);
        await prisma.product_images.create({
            data: { product_id: prod.id, image_url: localUrl, is_main: true }
        });
        await prisma.product_images.create({
            data: { product_id: prod.id, image_url: localUrl, is_main: false }
        });

        const n = Math.floor(Math.random() * 3) + 3;
        for (let i = 0; i < n; i++) {
            await prisma.product_reviews.create({
                data: { product_id: prod.id, rating: Math.floor(Math.random()*2)+4, comment: reviews[i % reviews.length] }
            });
        }
        process.stdout.write(`  ✅ ${p.name.substring(0,50)}\n`);
    }

    console.log('\n🎉 Hoàn tất! 50 sản phẩm đã được seed với ảnh LOCAL.');
}

main()
    .catch(e => { console.error('❌ Lỗi:', e); process.exit(1); })
    .finally(() => prisma.$disconnect());
