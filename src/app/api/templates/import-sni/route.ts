import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// SNI Construction Checklist Data - Updated Version
const SNI_CONSTRUCTION_CHECKLIST = {
    name: "Daftar Simak Kendali Mutu Konstruksi Rumah Tinggal (Standar SNI)",
    description: "Checklist quality control untuk konstruksi rumah tinggal berdasarkan standar SNI",
    projectType: "CONSTRUCTION",
    phases: [
        {
            code: "I",
            name: "Pekerjaan Persiapan & Tanah",
            order: 101,
            items: [
                { code: "1.1", title: "Pembersihan Lahan (Land Clearing)", standard: "Lahan bersih dari akar pohon, sampah organik, dan puing. Top soil (tanah humus) dikupas min. 20 cm agar pondasi duduk di tanah keras.", method: "Visual" },
                { code: "1.2", title: "Bowplank & Titik As", standard: "Sudut siku 90 derajat (cek rumus 3-4-5). Level peil lantai (±0.00) ditandai jelas dan tidak berubah. Jarak as ke as sesuai gambar denah.", method: "Meteran & Siku Besi" },
                { code: "1.3", title: "Galian Tanah Pondasi", standard: "Kedalaman galian mencapai tanah keras (min. 60-80 cm untuk rumah 1 lantai). Lebar dasar sesuai gambar (biasanya min. 60 cm untuk pondasi menerus).", method: "Meteran" },
                { code: "1.4", title: "Urugan Pasir Bawah Pondasi", standard: "Ketebalan pasir urug padat minimal 5-10 cm di bawah pondasi/lantai kerja. Harus disiram air dan dipadatkan.", method: "Visual & Tusuk Besi" }
            ]
        },
        {
            code: "II",
            name: "Pekerjaan Pondasi Batu Kali",
            order: 102,
            items: [
                { code: "2.1", title: "Kualitas Batu & Adukan", standard: "Batu belah keras (bukan batu kapur/cadas rapuh). Adukan spesi kedap air (campuran 1PC:4PS atau 1PC:5PS). Rongga antar batu terisi penuh adukan (tidak kopong).", method: "Visual & Palu" },
                { code: "2.2", title: "Aanstamping (Batu Kosong)", standard: "Pasangan batu kosong berdiri tegak di atas pasir urug, celah diisi pasir, disiram air hingga padat.", method: "Visual" },
                { code: "2.3", title: "Stek Kolom (Angkur)", standard: "Besi stek kolom terpasang tertanam dalam pondasi min. 40x diameter besi. Jarak antar stek sesuai as kolom.", method: "Meteran" }
            ]
        },
        {
            code: "III",
            name: "Pekerjaan Beton Bertulang (Sloof, Kolom, Ring Balk)",
            order: 103,
            items: [
                { code: "3.1", title: "Kualitas Besi Tulangan (Rebar)", standard: "Menggunakan besi bersertifikat SNI (Bukan banci). Toleransi diameter geser < ±0.3mm. Besi ulir untuk tulangan utama, besi polos untuk sengkang.", method: "Sigmat (Jangka Sorong)" },
                { code: "3.2", title: "Pabrikasi Besi (Pembesian)", standard: "Panjang penyaluran (overlap) sambungan besi minimal 40D (40 x diameter). Ujung besi ditekuk kait (hak) standar 135 derajat (gempa) atau 90 derajat.", method: "Visual & Meteran" },
                { code: "3.3", title: "Jarak Sengkang (Begel)", standard: "Jarak sengkang tumpuan (area dekat sambungan) lebih rapat (100-150 mm) dibanding lapangan (150-200 mm). Ikatan kawat bendrat kuat, tidak goyang.", method: "Meteran" },
                { code: "3.4", title: "Bekisting (Cetakan)", standard: "Bekisting bersih, diminyaki (oli bekas/mold oil), rapat (tidak bocor air semen), dan kokoh (tidak mekar saat dicor).", method: "Visual" },
                { code: "3.5", title: "Selimut Beton (Decking)", standard: "Wajib pasang tahu beton (beton decking) tebal 2 cm (balok/kolom) atau 4 cm (pondasi) agar besi tidak menempel bekisting/tanah.", method: "Visual" },
                { code: "3.6", title: "Pengecoran & Campuran", standard: "Campuran setara K-175/K-225 (Perbandingan volume manual ± 1 Semen : 2 Pasir : 3 Kerikil). Slump test (kekentalan) 10 ± 2 cm. Wajib digetar/ditusuk agar tidak keropos.", method: "Slump Cone & Visual" }
            ]
        },
        {
            code: "IV",
            name: "Pekerjaan Dinding (Bata Merah / Hebel)",
            order: 104,
            items: [
                { code: "4.1", title: "Persiapan Material Dinding", standard: "Bata merah wajib direndam air sampai jenuh sebelum pasang. Hebel tidak perlu rendam, tapi permukaan dibasahi sedikit.", method: "Visual" },
                { code: "4.2", title: "Kelurusan & Ketegakan", standard: "Dinding tegak lurus (lot/unting-unting). Toleransi kemiringan vertikal maks 3mm per meter tinggi. Siar adukan terisi penuh.", method: "Waterpass / Unting-unting" },
                { code: "4.3", title: "Dinding Trasram (Kedap Air)", standard: "Campuran 1PC:2PS atau 1PC:3PS wajib dipasang setinggi min. 30-50 cm dari lantai di area basah (KM/WC) dan dinding luar keliling bangunan.", method: "Cek Adukan & Visual" },
                { code: "4.4", title: "Kolom Praktis & Ring Balok", standard: "Wajib ada kolom praktis tiap luasan dinding 9-12 m² atau tiap jarak 3 meter. Ring balok wajib mengikat keliling atas dinding.", method: "Meteran" }
            ]
        },
        {
            code: "V",
            name: "Pekerjaan Kusen, Pintu, & Jendela",
            order: 105,
            items: [
                { code: "5.1", title: "Pemasangan Kusen", standard: "Kusen terpasang waterpass (rata air) dan tegak lurus (plumb). Tidak terpuntir. Aluminium diproteksi lakban/plastik saat pekerjaan plester/aci.", method: "Waterpass" },
                { code: "5.2", title: "Sealant & Celah", standard: "Celah antara kusen dan dinding (openingan) tertutup rapat (sealant untuk aluminium, spesi padat untuk kayu). Tidak ada celah cahaya/air masuk.", method: "Visual (Senter)" },
                { code: "5.3", title: "Daun Pintu & Engsel", standard: "Celah (gap) pintu ke lantai 0.5 cm (tanpa karpet) atau disesuaikan. Engsel minimal 3 buah untuk pintu solid, 2 buah untuk pintu ringan.", method: "Operasional Test" }
            ]
        },
        {
            code: "VI",
            name: "Pekerjaan Rangka Atap & Penutup",
            order: 106,
            items: [
                { code: "6.1", title: "Rangka Baja Ringan", standard: "Jarak kuda-kuda maks 1.0 - 1.2 m. Dynabolt terpasang kuat ke Ring Balok. Screw terpasang minimal 3-4 buah per buhul (joint). Coating AZ tidak tergores parah.", method: "Meteran & Visual" },
                { code: "6.2", title: "Kemiringan Atap", standard: "Kemiringan sesuai jenis genteng (Keramik/Beton min 30-35 derajat, Metal min 15-20 derajat, Spandek min 5-10 derajat).", method: "Waterpass Digital / Inclinometer" },
                { code: "6.3", title: "Pemasangan Genteng", standard: "Overlap (tumpukan) genteng rapi dan lurus. Nok/Karpus terpasang rapi dengan adukan kedap air dan finish cat anti-bocor (waterproofing).", method: "Visual" },
                { code: "6.4", title: "Talang Air (Jika ada)", standard: "Kemiringan talang min 1-2% ke arah corong buang. Sambungan talang dites rendam (tidak bocor).", method: "Flood Test (Siram Air)" }
            ]
        },
        {
            code: "VII",
            name: "Pekerjaan MEP (Mekanikal, Elektrikal, Plumbing)",
            order: 107,
            items: [
                { code: "7.1", title: "Instalasi Air Bersih", standard: "Pipa terpasang kuat (klem tiap 1.5m). Tes tekan pipa (pressure test) 1.5x tekanan kerja selama min. 4 jam sebelum dipasang keramik. Tidak rembes.", method: "Pressure Gauge" },
                { code: "7.2", title: "Instalasi Air Kotor", standard: "Kemiringan pipa buang min 1-2% (turun 1-2 cm per 1 meter panjang). Menggunakan fitting \"Y\" (bukan \"T\") untuk air kotor agar tidak mampet.", method: "Waterpass" },
                { code: "7.3", title: "Septic Tank & Resapan", standard: "Jarak tangki septik ke sumur air bersih min. 10 meter (SNI 03-2398-2002). Pipa leher angsa berfungsi (segel air).", method: "Meteran" },
                { code: "7.4", title: "Instalasi Listrik (Kabel)", standard: "Ukuran kabel sesuai beban (Min 1.5mm² lampu, 2.5mm² stop kontak). Sambungan kabel dalam T-Dus wajib ditutup lasdop. Warna kabel standar (Fasa: Hitam/Merah, Netral: Biru, Arde: Kuning-Hijau).", method: "Visual" },
                { code: "7.5", title: "Grounding (Arde)", standard: "Tahanan grounding < 5 Ohm. Kabel grounding terhubung ke semua stop kontak.", method: "Earth Tester" }
            ]
        },
        {
            code: "VIII",
            name: "Pekerjaan Lantai & Finishing",
            order: 108,
            items: [
                { code: "8.1", title: "Persiapan Dasar Lantai", standard: "Tanah dasar dipadatkan (stamper) + pasir urug 5-10 cm + lantai kerja (rabat beton) 3-5 cm.", method: "Visual" },
                { code: "8.2", title: "Pemasangan Keramik/Granit", standard: "Nat lurus dan konsisten (pakai tile spacer). Perpotongan 4 keramik rata (tidak \"gigi kuda\"). Kemiringan lantai KM/WC & Teras 1% ke arah floor drain.", method: "Waterpass & Koin" },
                { code: "8.3", title: "Kepadatan Adukan (Ketuk)", standard: "Ketuk permukaan keramik setelah kering (3-5 hari). Suara harus padat (tidak nyaring/kopong). Toleransi kopong max 5% per keping di sudut.", method: "Ketuk (Coin/Stick)" }
            ]
        },
        {
            code: "IX",
            name: "Pekerjaan Pengecatan (Finishing)",
            order: 109,
            items: [
                { code: "9.1", title: "Persiapan Permukaan", standard: "Dinding rata, halus, kering (kelembaban < 18%). Tidak ada retak rambut. Sudah diamplas.", method: "Moisture Meter & Visual" },
                { code: "9.2", title: "Aplikasi Cat Dasar (Alkali Sealer)", standard: "Wajib 1 lapis sealer untuk tahan alkali semen & daya rekat cat lebih baik.", method: "Visual" },
                { code: "9.3", title: "Pengecatan Finish", standard: "Minimal 2 lapis. Warna rata, tidak belang (shadow), tidak ada cipratan di lantai/kusen. Garis pertemuan warna (cutting) rapi.", method: "Visual (lampu sorot)" }
            ]
        },
        {
            code: "X",
            name: "Serah Terima (Handover) & Final Check",
            order: 110,
            items: [
                { code: "10.1", title: "Tes Fungsi Utilitas (MEP Final)", standard: "Semua lampu menyala. Stop kontak ada setrum. Kran air mengalir deras. Drainase lancar. MCB panel diberi label.", method: "Test Fungsi" },
                { code: "10.2", title: "Hardware Pintu & Jendela", standard: "Kunci pintu berfungsi lancar (tidak macet). Anak kunci lengkap. Handle kokoh. Engsel tidak bunyi.", method: "Operasional" },
                { code: "10.3", title: "Kebersihan Akhir (Deep Cleaning)", standard: "Lantai bersih dari noda cat/semen. Kaca jendela bersih. Sanitary higienis bebas stiker pabrik. Area luar bebas puing.", method: "Visual" },
                { code: "10.4", title: "Dokumen Serah Terima", standard: "Gambar As-Built. Berita Acara Serah Terima (BAST). Kartu Garansi (Pompa/AC/Water Heater). Kunci cadangan lengkap.", method: "Cek Dokumen" },
                { code: "10.5", title: "Periode Retensi (Garansi)", standard: "Disepakati masa pemeliharaan (biasanya 3-6 bulan) untuk perbaikan retak rambut atau bocor.", method: "Kontrak" }
            ]
        }
    ]
};

export async function POST(request: NextRequest) {
    try {
        console.log('=== IMPORTING SNI CONSTRUCTION CHECKLIST ===');

        // Check if template already exists
        const existingTemplate = await db.checklistTemplate.findFirst({
            where: { name: SNI_CONSTRUCTION_CHECKLIST.name }
        });

        if (existingTemplate) {
            return NextResponse.json({
                success: false,
                error: 'Template already exists',
                templateId: existingTemplate.id
            });
        }

        // Create phases first (if they don't exist with these names)
        const phaseMap = new Map<string, string>();

        for (const phaseData of SNI_CONSTRUCTION_CHECKLIST.phases) {
            // Check if phase exists
            let phase = await db.phase.findFirst({
                where: { name: phaseData.name }
            });

            if (!phase) {
                // Create new phase
                phase = await db.phase.create({
                    data: {
                        name: phaseData.name,
                        description: `Fase ${phaseData.code}: ${phaseData.name}`,
                        order: phaseData.order
                    }
                });
                console.log(`Created phase: ${phase.name}`);
            }

            phaseMap.set(phaseData.code, phase.id);
        }

        // Create template
        const template = await db.checklistTemplate.create({
            data: {
                name: SNI_CONSTRUCTION_CHECKLIST.name,
                description: SNI_CONSTRUCTION_CHECKLIST.description,
                projectType: SNI_CONSTRUCTION_CHECKLIST.projectType,
                version: "1.0",
                isActive: true,
                items: {
                    create: SNI_CONSTRUCTION_CHECKLIST.phases.flatMap(phase =>
                        phase.items.map(item => ({
                            phaseId: phaseMap.get(phase.code)!,
                            code: item.code,
                            title: item.title,
                            acceptanceCriteria: item.standard,
                            checkMethod: item.method,
                            isMandatory: true,
                            weight: 1,
                            requirePhoto: true,
                            requireValue: false,
                            attachmentType: 'PHOTO' as const
                        }))
                    )
                }
            },
            include: {
                items: true
            }
        });

        console.log(`Created template: ${template.name} with ${template.items.length} items`);

        return NextResponse.json({
            success: true,
            message: `Template "${template.name}" berhasil diimport dengan ${template.items.length} item checklist`,
            templateId: template.id,
            itemCount: template.items.length,
            phases: SNI_CONSTRUCTION_CHECKLIST.phases.map(p => p.name)
        });

    } catch (error) {
        console.error('Error importing template:', error);
        return NextResponse.json(
            {
                error: 'Failed to import template',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

export async function GET() {
    // Return template info
    const templates = await db.checklistTemplate.findMany({
        include: {
            _count: {
                select: { items: true }
            }
        }
    });

    return NextResponse.json({
        templates: templates.map(t => ({
            id: t.id,
            name: t.name,
            projectType: t.projectType,
            itemCount: t._count.items,
            isActive: t.isActive
        }))
    });
}
