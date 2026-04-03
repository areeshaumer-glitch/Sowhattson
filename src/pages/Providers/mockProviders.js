/** Shared mock rows for list + detail when API is unavailable. */

const emptyDocPair = () => ({ front: null, back: null });

function picPair(seed) {
  return {
    front: `https://picsum.photos/seed/${seed}f/420/280`,
    back: `https://picsum.photos/seed/${seed}b/420/280`,
  };
}

function avatarUrl(name) {
  const q = encodeURIComponent(name || 'User');
  return `https://ui-avatars.com/api/?name=${q}&size=128&background=ECE6D7&color=66307B&bold=true`;
}

export const MOCK_PROVIDERS = Array.from({ length: 18 }, (_, i) => {
  const verificationStatus = ['verified', 'verified', 'pending', 'verified', 'rejected', 'verified', 'pending', 'verified', 'verified', 'pending', 'verified', 'verified', 'rejected', 'verified', 'verified', 'pending', 'verified', 'verified'][i];
  const isVerified = verificationStatus === 'verified';
  const isPending = verificationStatus === 'pending';

  const phone = `+234 80${i} ${String(1234567 + i).slice(0, 7)}`;
  const email = `provider${i + 1}@business.com`;
  const name = ['Tunde Oye', 'Aisha Bello', 'Chidi Eze', 'Ngozi Obi', 'Seun Kuti', 'Yemi Shoaib', 'Kola Babs', 'Funmi Ada', 'Emeka Eze', 'Zainab Ali', 'Bola James', 'Ada Osei', 'Femi Ade', 'Nneka Ojo', 'Jide Cole', 'Sola Tai', 'Kunle Ade', 'Amaka Nze'][i];
  const religions = ['Christianity', 'Islam', 'Christianity', 'Islam', 'Traditional', 'Christianity', 'Islam', 'Prefer not to say', 'Christianity', 'Islam', 'Christianity', 'Islam', 'Christianity', 'Islam', 'Traditional', 'Christianity', 'Islam', 'Christianity'];
  const region = i % 2 === 0 ? 'Nigeria' : 'Ghana';
  const banks = ['GTBank', 'Access Bank', 'Zenith Bank', 'First Bank', 'UBA', 'Fidelity Bank', 'GTBank', 'Access Bank', 'Zenith Bank', 'First Bank', 'UBA', 'GTBank', 'Access Bank', 'Zenith Bank', 'First Bank', 'UBA', 'GTBank', 'Access Bank'];
  const nameParts = name.split(/\s+/);
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';
  const accountDigits = `01${String(23456780 + i).padStart(8, '0')}`.slice(0, 10);

  let documents = {
    identityCard: emptyDocPair(),
    passport: emptyDocPair(),
    drivingLicense: emptyDocPair(),
    nationalIdCard: emptyDocPair(),
    selfie: null,
  };

  let org = {
    phone: null,
    email: null,
    documentType: null,
    documents,
  };

  if (isVerified) {
    const docType = ['Passport', 'Driving License', 'Identity card'][i % 3];
    const seed = `pv${i}`;
    documents = {
      identityCard: emptyDocPair(),
      passport: emptyDocPair(),
      drivingLicense: emptyDocPair(),
      nationalIdCard: emptyDocPair(),
      selfie: `https://picsum.photos/seed/${seed}s/400/400`,
    };
    if (docType === 'Passport') documents.passport = picPair(seed);
    else if (docType === 'Driving License') documents.drivingLicense = picPair(seed);
    else {
      documents.identityCard = picPair(`${seed}id`);
      documents.nationalIdCard = picPair(`${seed}nid`);
    }
    org = {
      phone,
      email,
      documentType: docType,
      documents,
    };
  } else if (isPending) {
    if (i % 3 === 0) {
      org = { phone, email, documentType: 'Passport', documents };
    } else if (i % 3 === 1) {
      org = { phone: null, email, documentType: null, documents };
    } else {
      org = { phone, email: null, documentType: 'Identity card', documents };
    }
  }

  return {
    id: String(i + 1),
    userId: String(i + 50),
    name,
    email,
    suspended: i % 7 === 0,
    businessName: ['TxEvents Ltd', 'LuxEvents Co', 'PrimeShow Inc', 'TechHub NG', 'GastroPro', 'ArtSpace', 'FitLife', 'BizConnect', 'FilmHouse', 'DanceAcademy', 'VinoCo', 'CarnivalPro', 'BookFair Co', 'StyleHouse', 'SportsPro', 'GreenLife', 'TechVentures', 'FoodCraft'][i],
    phone,
    region,
    bankName: isPending && i % 4 === 2 ? null : banks[i],
    accountNumber: isPending && i % 4 === 2 ? null : accountDigits,
    firstName,
    lastName,
    religion: religions[i],
    profileImageUrl: avatarUrl(name),
    isVerified,
    verificationStatus,
    eventsCount: 2 + i * 2,
    revenue: 10000 + i * 8000,
    rating: 3.8 + (i % 5) * 0.25,
    followersCount: 50 + i * 40,
    createdAt: `2025-0${(i % 12) + 1}-10`,
    organizerVerification: org,
  };
});

export function findMockProvider(id) {
  return MOCK_PROVIDERS.find((p) => String(p.id) === String(id)) ?? null;
}
