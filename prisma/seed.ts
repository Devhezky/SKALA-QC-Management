import { PrismaClient, AttachmentType } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Start seeding...')

  // Create phases
  const phases = await Promise.all([
    prisma.phase.create({
      data: {
        name: '1. Fase Persiapan (Pre-Production)',
        description: 'Fase persiapan sebelum produksi dimulai',
        order: 1
      }
    }),
    prisma.phase.create({
      data: {
        name: '2. Pemilihan Bahan (Incoming QC)',
        description: 'Quality control material yang masuk',
        order: 2
      }
    }),
    prisma.phase.create({
      data: {
        name: '3. Pemotongan Bahan & Cutlist',
        description: 'Proses pemotongan material sesuai cutlist',
        order: 3
      }
    }),
    prisma.phase.create({
      data: {
        name: '4. Perakitan (Assembly)',
        description: 'Proses perakitan komponen furniture',
        order: 4
      }
    }),
    prisma.phase.create({
      data: {
        name: '5. Finishing HPL, Tusir & Edging',
        description: 'Proses finishing akhir furniture',
        order: 5
      }
    }),
    prisma.phase.create({
      data: {
        name: '6. Pemasangan Aksesoris',
        description: 'Pemasangan aksesoris seperti engsel, rel, dll',
        order: 6
      }
    }),
    prisma.phase.create({
      data: {
        name: '7. Instalasi Kelistrikan (Furnitur)',
        description: 'Instalasi sistem kelistrikan pada furniture',
        order: 7
      }
    }),
    prisma.phase.create({
      data: {
        name: '8. Instalasi Plumbing (Kitchen & Vanity)',
        description: 'Instalasi plumbing untuk kitchen dan vanity',
        order: 8
      }
    }),
    prisma.phase.create({
      data: {
        name: '9. Instalasi Produk (Site Installation)',
        description: 'Instalasi produk di lokasi proyek',
        order: 9
      }
    })
  ])

  // Create template
  const template = await prisma.checklistTemplate.create({
    data: {
      name: 'Standar QC Kitchen Set',
      description: 'Template standar QC untuk proyek kitchen set',
      projectType: 'Kitchen Set',
      version: '1.0'
    }
  })

  // Checklist items from Excel
  const checklistItems = [
    // Fase 1 - Persiapan
    {
      phaseId: phases[0].id,
      code: '1.1',
      title: 'Gambar Kerja (Shop Drawing)',
      acceptanceCriteria: 'Gambar sudah disetujui (Approved) & memuat detail MEP (posisi stop kontak/kran)',
      checkMethod: 'Cek Dokumen',
      isMandatory: true,
      weight: 2,
      requirePhoto: false,
      requireValue: false,
      attachmentType: AttachmentType.DOCUMENT
    },
    {
      phaseId: phases[0].id,
      code: '1.2',
      title: 'Shop Drawing Re-Check',
      acceptanceCriteria: 'Gambar kerja telah diukur ulang bersama dengan tim Kepala Tukang, Supervisor dan QC',
      checkMethod: 'Pengukuran Ulang',
      isMandatory: true,
      weight: 2,
      requirePhoto: false,
      requireValue: false,
      attachmentType: AttachmentType.NONE
    },
    {
      phaseId: phases[0].id,
      code: '1.3',
      title: 'Ukuran Lapangan',
      acceptanceCriteria: 'Ukuran aktual lapangan sudah divalidasi dengan gambar kerja (Cross-check)',
      checkMethod: 'Meteran',
      isMandatory: true,
      weight: 2,
      requirePhoto: false,
      requireValue: true,
      attachmentType: AttachmentType.PHOTO
    },
    {
      phaseId: phases[0].id,
      code: '1.4',
      title: 'Kesiapan Alat',
      acceptanceCriteria: 'Mata gergaji tajam (agar potongan tidak chipping) & alat ukur terkalibrasi',
      checkMethod: 'Visual',
      isMandatory: false,
      weight: 1,
      requirePhoto: false,
      requireValue: false,
      attachmentType: AttachmentType.NONE
    },

    // Fase 2 - Pemilihan Bahan
    {
      phaseId: phases[1].id,
      code: '2.1',
      title: 'Ketebalan Plywood (Struktural)',
      acceptanceCriteria: 'Wajib Kualitas ASLI bukan Banci. Toleransi plywood kalibrasi ±0.5mm. Tolak jika deviasi >1.5mm (Plywood Banci)',
      checkMethod: 'Jangka Sorong (Sketmat)',
      isMandatory: true,
      weight: 5,
      requirePhoto: true,
      requireValue: true,
      attachmentType: AttachmentType.PHOTO
    },
    {
      phaseId: phases[1].id,
      code: '2.2',
      title: 'Kualitas HPL',
      acceptanceCriteria: 'Tidak ada keretakan pada HPL yang datang',
      checkMethod: 'Visual',
      isMandatory: false,
      weight: 2,
      requirePhoto: true,
      requireValue: false,
      attachmentType: AttachmentType.PHOTO
    },
    {
      phaseId: phases[1].id,
      code: '2.3',
      title: 'Lem Kuning',
      acceptanceCriteria: 'Kualitas Lem minimal Rajawali Merah, Fox Prima D, dan TACO Active Plus',
      checkMethod: 'Visual',
      isMandatory: false,
      weight: 2,
      requirePhoto: false,
      requireValue: false,
      attachmentType: AttachmentType.NONE
    },
    {
      phaseId: phases[1].id,
      code: '2.4',
      title: 'Aksesoris Engsel',
      acceptanceCriteria: 'Aksesoris minimal chrome TACO dan Huben. Untuk Stainless 304 merk: TACO, Huben, Hafele dan Blum',
      checkMethod: 'Visual',
      isMandatory: false,
      weight: 3,
      requirePhoto: true,
      requireValue: false,
      attachmentType: AttachmentType.PHOTO
    },
    {
      phaseId: phases[1].id,
      code: '2.5',
      title: 'Aksesoris Rel',
      acceptanceCriteria: 'Rel Laci wajib Doubletrack untuk kualitas Standart dan Tandem untuk kualitas luxury. Merk: TACO, Huben, Hafele, dan Blum',
      checkMethod: 'Visual',
      isMandatory: false,
      weight: 3,
      requirePhoto: true,
      requireValue: false,
      attachmentType: AttachmentType.PHOTO
    },

    // Fase 3 - Pemotongan Bahan
    {
      phaseId: phases[2].id,
      code: '3.1',
      title: 'Dimensi Potong',
      acceptanceCriteria: 'Presisi ±1mm dari Cutting List',
      checkMethod: 'Meteran',
      isMandatory: true,
      weight: 4,
      requirePhoto: false,
      requireValue: true,
      attachmentType: AttachmentType.NONE
    },
    {
      phaseId: phases[2].id,
      code: '3.2',
      title: 'Ketegakluran (Squareness)',
      acceptanceCriteria: 'Selisih ukuran diagonal sisi kiri-atas ke kanan-bawah vs kanan-atas ke kiri-bawah maksimal 2mm',
      checkMethod: 'Ukur Diagonal (X1 vs X2)',
      isMandatory: true,
      weight: 4,
      requirePhoto: false,
      requireValue: true,
      attachmentType: AttachmentType.NONE
    },
    {
      phaseId: phases[2].id,
      code: '3.3',
      title: 'Kualitas Potongan',
      acceptanceCriteria: 'Tepi potongan rata, tidak chipping (ompong) parah yang tidak bisa ditutup edging',
      checkMethod: 'Visual',
      isMandatory: false,
      weight: 2,
      requirePhoto: true,
      requireValue: false,
      attachmentType: AttachmentType.PHOTO
    },

    // Fase 4 - Perakitan
    {
      phaseId: phases[3].id,
      code: '4.1',
      title: 'Konstruksi Laci',
      acceptanceCriteria: 'Dasar laci masuk ke alur (dado/groove). DILARANG hanya dipaku tembak dari bawah',
      checkMethod: 'Visual Fisik',
      isMandatory: true,
      weight: 4,
      requirePhoto: true,
      requireValue: false,
      attachmentType: AttachmentType.PHOTO
    },
    {
      phaseId: phases[3].id,
      code: '4.2',
      title: 'Kekakuan Box',
      acceptanceCriteria: 'Kabinet kaku, tidak goyang (racking) saat didorong sisi sampingnya',
      checkMethod: 'Dorong Manual',
      isMandatory: true,
      weight: 4,
      requirePhoto: false,
      requireValue: false,
      attachmentType: AttachmentType.NONE
    },
    {
      phaseId: phases[3].id,
      code: '4.3',
      title: 'Posisi Sekrup',
      acceptanceCriteria: 'Sekrup tidak dol (stripped) dan kepala sekrup rata (countersunk) dengan permukaan',
      checkMethod: 'Raba & Putar',
      isMandatory: false,
      weight: 2,
      requirePhoto: false,
      requireValue: false,
      attachmentType: AttachmentType.NONE
    },
    {
      phaseId: phases[3].id,
      code: '4.4',
      title: 'Backing Panel',
      acceptanceCriteria: 'Tutup kabinet belakang menggunakan material min. 9 mm untuk Plymin (doff) dan Plywood',
      checkMethod: 'Visual',
      isMandatory: false,
      weight: 2,
      requirePhoto: false,
      requireValue: false,
      attachmentType: AttachmentType.NONE
    },
    {
      phaseId: phases[3].id,
      code: '4.5',
      title: 'Konstruksi Dasaran Kabinet',
      acceptanceCriteria: 'Min. 5 cm untuk dasaran, menggunakan material 18 mm dengan sistem rangka',
      checkMethod: 'Visual & Ukur',
      isMandatory: true,
      weight: 3,
      requirePhoto: false,
      requireValue: true,
      attachmentType: AttachmentType.NONE
    },
    {
      phaseId: phases[3].id,
      code: '4.6',
      title: 'Konstruksi Sekat Kabinet',
      acceptanceCriteria: 'Sekat kabinet menggunakan sekatan min 18 mm dengan Plymin Doff dan 18 mm untuk Plywood dengan fin. HPL',
      checkMethod: 'Visual & Ukur',
      isMandatory: false,
      weight: 3,
      requirePhoto: false,
      requireValue: false,
      attachmentType: AttachmentType.NONE
    },
    {
      phaseId: phases[3].id,
      code: '4.7',
      title: 'Top Table HPL',
      acceptanceCriteria: 'Top Table Kabinet menggunakan plywood 18 mm dengan finishing atas HPL dan bawah HPL',
      checkMethod: 'Visual & Ukur',
      isMandatory: false,
      weight: 2,
      requirePhoto: false,
      requireValue: false,
      attachmentType: AttachmentType.NONE
    },
    {
      phaseId: phases[3].id,
      code: '4.8',
      title: 'Top Table Granit',
      acceptanceCriteria: 'Top table granit min. ketebalan 12 mm dan WAJIB diberikan dasaran 15 mm plywood untuk menambah kekuatan',
      checkMethod: 'Visual & Ukur',
      isMandatory: true,
      weight: 4,
      requirePhoto: false,
      requireValue: true,
      attachmentType: AttachmentType.NONE
    },

    // Fase 5 - Finishing
    {
      phaseId: phases[4].id,
      code: '5.1',
      title: 'Permukaan HPL',
      acceptanceCriteria: 'Rata sempurna. Tidak ada gelembung (blistering) atau suara "kopong"',
      checkMethod: 'Ketuk & Raba',
      isMandatory: true,
      weight: 4,
      requirePhoto: true,
      requireValue: false,
      attachmentType: AttachmentType.PHOTO
    },
    {
      phaseId: phases[4].id,
      code: '5.2',
      title: 'Kebersihan Lem',
      acceptanceCriteria: 'Bebas residu lem kuning di permukaan. Lem yang tertinggal akan menguning',
      checkMethod: 'Visual',
      isMandatory: false,
      weight: 1,
      requirePhoto: false,
      requireValue: false,
      attachmentType: AttachmentType.NONE
    },
    {
      phaseId: phases[4].id,
      code: '5.3',
      title: 'Kekuatan Edging',
      acceptanceCriteria: 'Pintu wajib menggunakan PVC Edging Tidak mudah dikupas. Tes kupas sisa potongan harus merusak serat kayu',
      checkMethod: 'Peel Test (Sampel)',
      isMandatory: true,
      weight: 4,
      requirePhoto: true,
      requireValue: false,
      attachmentType: AttachmentType.PHOTO
    },
    {
      phaseId: phases[4].id,
      code: '5.4',
      title: 'Kerapian Edging',
      acceptanceCriteria: 'Rata (flush) dengan panel. Tidak tajam (sharp edges) dan tidak undercut (isi plywood terlihat)',
      checkMethod: 'Raba Tepi',
      isMandatory: false,
      weight: 2,
      requirePhoto: false,
      requireValue: false,
      attachmentType: AttachmentType.NONE
    },
    {
      phaseId: phases[4].id,
      code: '5.5',
      title: 'Edging Sekat',
      acceptanceCriteria: 'Menggunakan Edging HPL yang telah diamplas min. 0.5 mm secara halus, tidak ada kopong/bolong, dan ditambal menggunakan lem G',
      checkMethod: 'Raba Tepi',
      isMandatory: false,
      weight: 2,
      requirePhoto: false,
      requireValue: false,
      attachmentType: AttachmentType.NONE
    },
    {
      phaseId: phases[4].id,
      code: '5.6',
      title: 'Tusir Sudut (Nating)',
      acceptanceCriteria: 'Garis hitam pertemuan HPL (nut) disamarkan dengan spidol furniture/cat tusir atau chamfer halus',
      checkMethod: 'Visual Jarak Dekat',
      isMandatory: false,
      weight: 1,
      requirePhoto: false,
      requireValue: false,
      attachmentType: AttachmentType.NONE
    },
    {
      phaseId: phases[4].id,
      code: '5.7',
      title: 'Sealant Kabinet',
      acceptanceCriteria: 'Sealant bagian dalam kabinet menggunakan Sealant Non-Asam (neutral) berwarna putih untuk melamin, dan hitam untuk motif kayu dengan tebal maksimal 1 mm',
      checkMethod: 'Visual jarak dekat',
      isMandatory: false,
      weight: 1,
      requirePhoto: false,
      requireValue: false,
      attachmentType: AttachmentType.NONE
    },

    // Fase 6 - Pemasangan Aksesoris
    {
      phaseId: phases[5].id,
      code: '6.1',
      title: 'Engsel Pintu',
      acceptanceCriteria: 'Fitur Soft Close berfungsi mulus, tidak tersendat. Celah pintu seragam (3-4mm). Pasang semua skrup jangan sampai ada yang tertinggal',
      checkMethod: 'Buka-Tutup 5x',
      isMandatory: true,
      weight: 3,
      requirePhoto: true,
      requireValue: true,
      attachmentType: AttachmentType.PHOTO
    },
    {
      phaseId: phases[5].id,
      code: '6.2',
      title: 'Rel Laci',
      acceptanceCriteria: 'Laci berjalan mulus, tidak macet. Lebar laci sesuai spek rel (misal rel Tandem). Pasang semua skrup jangan sampai ada yang tertinggal',
      checkMethod: 'Tarik-Dorong',
      isMandatory: true,
      weight: 3,
      requirePhoto: true,
      requireValue: false,
      attachmentType: AttachmentType.PHOTO
    },
    {
      phaseId: phases[5].id,
      code: '6.3',
      title: 'Pintu Geser',
      acceptanceCriteria: 'Fitur Anti-Jump aktif (pintu tidak lompat dari rel). Overlapping min 3-5cm',
      checkMethod: 'Geser Cepat',
      isMandatory: false,
      weight: 2,
      requirePhoto: false,
      requireValue: true,
      attachmentType: AttachmentType.NONE
    },
    {
      phaseId: phases[5].id,
      code: '6.4',
      title: 'Rak Gantung',
      acceptanceCriteria: 'Pipa gantungan >1 meter WAJIB pakai penyangga tengah (center support)',
      checkMethod: 'Visual',
      isMandatory: true,
      weight: 3,
      requirePhoto: false,
      requireValue: false,
      attachmentType: AttachmentType.NONE
    },

    // Fase 7 - Instalasi Kelistrikan
    {
      phaseId: phases[6].id,
      code: '7.1',
      title: 'Speksifikasi LED',
      acceptanceCriteria: 'Minimal speksifikasi menggunakan LED 5050SMD (Mata Besar) dan LED Flex berwarna Warm White atau Cool White',
      checkMethod: 'Visual',
      isMandatory: false,
      weight: 2,
      requirePhoto: false,
      requireValue: false,
      attachmentType: AttachmentType.NONE
    },
    {
      phaseId: phases[6].id,
      code: '7.2',
      title: 'Speksifikasi Trafo',
      acceptanceCriteria: 'Minimal ampere untuk lampu <2.5 m menggunakan trafo 5A, 2.6 m - 5 m menggunakan trafo 10 A (apabila menjadi 1)',
      checkMethod: 'Visual',
      isMandatory: true,
      weight: 3,
      requirePhoto: false,
      requireValue: false,
      attachmentType: AttachmentType.NONE
    },
    {
      phaseId: phases[6].id,
      code: '7.3',
      title: 'Speksifikasi Kabel',
      acceptanceCriteria: 'Kabel NYZ berwarna putih/hitam uk. 0.75 x 2 merk Eterna untuk instalasi kabel, dan NYM untuk instalasi Stop Kontak dan Saklar',
      checkMethod: 'Visual',
      isMandatory: true,
      weight: 3,
      requirePhoto: false,
      requireValue: false,
      attachmentType: AttachmentType.NONE
    },
    {
      phaseId: phases[6].id,
      code: '7.4',
      title: 'LED Strip Housing',
      acceptanceCriteria: 'Wajib pakai profil aluminium + diffuser (tidak tempel langsung ke kayu) untuk buang panas',
      checkMethod: 'Visual',
      isMandatory: true,
      weight: 3,
      requirePhoto: true,
      requireValue: false,
      attachmentType: AttachmentType.PHOTO
    },
    {
      phaseId: phases[6].id,
      code: '7.5',
      title: 'Sambungan Kabel',
      acceptanceCriteria: 'Pakai terminal blok / Wago. DILARANG hanya sambungan plintir lakban hitam',
      checkMethod: 'Cek Sambungan',
      isMandatory: true,
      weight: 4,
      requirePhoto: true,
      requireValue: false,
      attachmentType: AttachmentType.PHOTO
    },
    {
      phaseId: phases[6].id,
      code: '7.6',
      title: 'Posisi Trafo (Driver)',
      acceptanceCriteria: 'Aksesibel (mudah diganti tanpa bongkar lemari). Ada lubang hawa',
      checkMethod: 'Lokasi Driver',
      isMandatory: true,
      weight: 3,
      requirePhoto: false,
      requireValue: false,
      attachmentType: AttachmentType.NONE
    },
    {
      phaseId: phases[6].id,
      code: '7.7',
      title: 'Jalur Kabel',
      acceptanceCriteria: 'Kabel tertanam rapi di groove belakang atau trunking, tidak semrawut. Pastikan segala sambungan kabel telah ditutup isolasi hitam',
      checkMethod: 'Visual Belakang',
      isMandatory: false,
      weight: 2,
      requirePhoto: false,
      requireValue: false,
      attachmentType: AttachmentType.NONE
    },

    // Fase 8 - Instalasi Plumbing
    {
      phaseId: phases[7].id,
      code: '8.1',
      title: 'Alas Kabinet Sink',
      acceptanceCriteria: 'Dilapisi plat aluminium / karpet karet kedap air',
      checkMethod: 'Visual',
      isMandatory: true,
      weight: 3,
      requirePhoto: true,
      requireValue: false,
      attachmentType: AttachmentType.PHOTO
    },
    {
      phaseId: phases[7].id,
      code: '8.2',
      title: 'Kemiringan Pipa',
      acceptanceCriteria: 'Pipa buang fleksibel miring 1-2% ke arah pembuangan (gravitasi lancar)',
      checkMethod: 'Waterpass',
      isMandatory: true,
      weight: 3,
      requirePhoto: false,
      requireValue: true,
      attachmentType: AttachmentType.NONE
    },
    {
      phaseId: phases[7].id,
      code: '8.3',
      title: 'P-Trap',
      acceptanceCriteria: 'Menggunakan leher angsa berkualitas (bukan selang ditekuk-tekuk)',
      checkMethod: 'Visual',
      isMandatory: true,
      weight: 3,
      requirePhoto: false,
      requireValue: false,
      attachmentType: AttachmentType.NONE
    },
    {
      phaseId: phases[7].id,
      code: '8.4',
      title: 'Tes Kebocoran',
      acceptanceCriteria: 'Isi bak penuh, buang sekaligus. Tidak ada rembesan di sambungan',
      checkMethod: 'Flood Test',
      isMandatory: true,
      weight: 4,
      requirePhoto: true,
      requireValue: false,
      attachmentType: AttachmentType.VIDEO
    },

    // Fase 9 - Instalasi Produk
    {
      phaseId: phases[8].id,
      code: '9.1',
      title: 'Angkur Dinding',
      acceptanceCriteria: 'Bata Merah: Dynabolt. Bata Ringan (Hebel): Fischer khusus Hebel/Chemical Anchor. Jangan pakai fischer biasa di Hebel',
      checkMethod: 'Cek Jenis Dinding',
      isMandatory: true,
      weight: 4,
      requirePhoto: true,
      requireValue: false,
      attachmentType: AttachmentType.PHOTO
    },
    {
      phaseId: phases[8].id,
      code: '9.2',
      title: 'Leveling',
      acceptanceCriteria: 'Kabinet & Top Table rata air (waterpass). Toleransi <1mm per meter',
      checkMethod: 'Waterpass Panjang',
      isMandatory: true,
      weight: 4,
      requirePhoto: false,
      requireValue: true,
      attachmentType: AttachmentType.NONE
    },
    {
      phaseId: phases[8].id,
      code: '9.3',
      title: 'Scribing (Celah Dinding)',
      acceptanceCriteria: 'Celah filler ke dinding maks 2-3mm, ditutup sealant rapi (paintable)',
      checkMethod: 'Visual',
      isMandatory: false,
      weight: 2,
      requirePhoto: false,
      requireValue: true,
      attachmentType: AttachmentType.NONE
    },
    {
      phaseId: phases[8].id,
      code: '9.4',
      title: 'Ventilasi Alat',
      acceptanceCriteria: 'Kulkas/Oven tanam punya celah udara (air gap) min 2 cm (bawah & atas)',
      checkMethod: 'Ukur Celah',
      isMandatory: true,
      weight: 3,
      requirePhoto: false,
      requireValue: true,
      attachmentType: AttachmentType.NONE
    },
    {
      phaseId: phases[8].id,
      code: '9.5',
      title: 'Ergonomi',
      acceptanceCriteria: 'Tinggi meja dapur 80-90cm. Jarak backsplash 55-60cm',
      checkMethod: 'Meteran',
      isMandatory: false,
      weight: 2,
      requirePhoto: false,
      requireValue: true,
      attachmentType: AttachmentType.NONE
    },
    {
      phaseId: phases[8].id,
      code: '9.6',
      title: 'Dishwasher',
      acceptanceCriteria: 'Dishwasher dibuat rapat tampak depan',
      checkMethod: 'Ukur Celah',
      isMandatory: false,
      weight: 1,
      requirePhoto: false,
      requireValue: true,
      attachmentType: AttachmentType.NONE
    },
    {
      phaseId: phases[8].id,
      code: '9.7',
      title: 'Manual Elektronik',
      acceptanceCriteria: 'Pastikan tim instalasi membaca semua manual book pada elektronik yang tertera di lokasi, terutama untuk elektronik yang tidak umum',
      checkMethod: 'Baca',
      isMandatory: false,
      weight: 1,
      requirePhoto: false,
      requireValue: false,
      attachmentType: AttachmentType.DOCUMENT
    },
    {
      phaseId: phases[8].id,
      code: '9.8',
      title: 'Plumbing & Elektrikal',
      acceptanceCriteria: 'Makesure posisi ukuran pipa pembuangan, air bersih, stop kontak, dan saklar sudah sesuai dengan produk yang dibuat',
      checkMethod: 'Ukur dan catat',
      isMandatory: true,
      weight: 3,
      requirePhoto: true,
      requireValue: true,
      attachmentType: AttachmentType.PHOTO
    }
  ]

  // Create checklist items
  await Promise.all(
    checklistItems.map(item =>
      prisma.checklistItemTemplate.create({
        data: {
          templateId: template.id,
          ...item
        }
      })
    )
  )

  // Create sample users
  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: 'qc@narapati.com',
        name: 'QC Inspector',
        role: 'QC'
      }
    }),
    prisma.user.create({
      data: {
        email: 'pm@narapati.com',
        name: 'Project Manager',
        role: 'PM'
      }
    }),
    prisma.user.create({
      data: {
        email: 'workshop@narapati.com',
        name: 'Kepala Workshop',
        role: 'WORKSHOP_HEAD'
      }
    }),
    prisma.user.create({
      data: {
        email: 'admin@narapati.com',
        name: 'Admin',
        role: 'ADMIN'
      }
    })
  ])

  // Create sample projects
  await Promise.all([
    prisma.project.create({
      data: {
        code: 'APB-001',
        name: 'Apartemen Pak Budi',
        clientName: 'Pak Budi',
        location: 'Jakarta Selatan',
        projectType: 'Kitchen Set',
        createdById: users[3].id // Admin
      }
    }),
    prisma.project.create({
      data: {
        code: 'KSM-002',
        name: 'Kitchen Set Ibu Siti',
        clientName: 'Ibu Siti',
        location: 'Bekasi',
        projectType: 'Kitchen Set',
        createdById: users[3].id // Admin
      }
    })
  ])

  console.log('Seeding finished.')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })