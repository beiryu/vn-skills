/**
 * Pre-2018 11-digit mobile prefix -> 10-digit prefix. The subscriber digits after the prefix are kept.
 * Source: Ministry of Information and Communications (MIC) conversion, 15/09/2018 - 30/06/2019, as reported by
 * VietNamNet https://vietnamnet.vn/bang-tong-hop-doi-11-so-thanh-10-so-cac-nha-mang-i375066.html
 */
export const OLD_MOBILE_PREFIXES: Readonly<Record<string, string>> = {
  '0162': '032',
  '0163': '033',
  '0164': '034',
  '0165': '035',
  '0166': '036',
  '0167': '037',
  '0168': '038',
  '0169': '039',
  '0120': '070',
  '0121': '079',
  '0122': '077',
  '0126': '076',
  '0128': '078',
  '0186': '056',
  '0188': '058',
  '0123': '083',
  '0124': '084',
  '0125': '085',
  '0127': '081',
  '0129': '082',
  '0199': '059',
};

/**
 * Current 10-digit mobile prefixes by ORIGINAL carrier. Number portability exists since 16/11/2018, so this is
 * not necessarily the current carrier.
 * Source: Circular 22/2014/TT-BTTTT (numbering plan) and MIC prefix allocations;
 * https://en.wikipedia.org/wiki/Telephone_numbers_in_Vietnam
 */
export const MOBILE_CARRIERS: Readonly<Record<string, readonly string[]>> = {
  Viettel: ['032', '033', '034', '035', '036', '037', '038', '039', '086', '096', '097', '098'],
  VinaPhone: ['081', '082', '083', '084', '085', '088', '091', '094'],
  MobiFone: ['070', '076', '077', '078', '079', '089', '090', '093'],
  Vietnamobile: ['052', '056', '058', '092'],
  Gmobile: ['059', '099'],
  iTel: ['087'],
  Wintel: ['055'],
};

/**
 * Fixed-line area codes (with leading 0) -> legacy (pre-2025, 63-province) province name as in legacy-63.json.
 * Source: Circular 22/2014/TT-BTTTT and the MIC area-code change announcement (phases 11/02/2017 - 17/06/2017).
 */
export const AREA_CODES: Readonly<Record<string, string>> = {
  '024': 'Hà Nội',
  '028': 'Hồ Chí Minh',
  '0203': 'Quảng Ninh',
  '0204': 'Bắc Giang',
  '0205': 'Lạng Sơn',
  '0206': 'Cao Bằng',
  '0207': 'Tuyên Quang',
  '0208': 'Thái Nguyên',
  '0209': 'Bắc Kạn',
  '0210': 'Phú Thọ',
  '0211': 'Vĩnh Phúc',
  '0212': 'Sơn La',
  '0213': 'Lai Châu',
  '0214': 'Lào Cai',
  '0215': 'Điện Biên',
  '0216': 'Yên Bái',
  '0218': 'Hòa Bình',
  '0219': 'Hà Giang',
  '0220': 'Hải Dương',
  '0221': 'Hưng Yên',
  '0222': 'Bắc Ninh',
  '0225': 'Hải Phòng',
  '0226': 'Hà Nam',
  '0227': 'Thái Bình',
  '0228': 'Nam Định',
  '0229': 'Ninh Bình',
  '0232': 'Quảng Bình',
  '0233': 'Quảng Trị',
  '0234': 'Thừa Thiên Huế',
  '0235': 'Quảng Nam',
  '0236': 'Đà Nẵng',
  '0237': 'Thanh Hóa',
  '0238': 'Nghệ An',
  '0239': 'Hà Tĩnh',
  '0251': 'Đồng Nai',
  '0252': 'Bình Thuận',
  '0254': 'Bà Rịa - Vũng Tàu',
  '0255': 'Quảng Ngãi',
  '0256': 'Bình Định',
  '0257': 'Phú Yên',
  '0258': 'Khánh Hòa',
  '0259': 'Ninh Thuận',
  '0260': 'Kon Tum',
  '0261': 'Đắk Nông',
  '0262': 'Đắk Lắk',
  '0263': 'Lâm Đồng',
  '0269': 'Gia Lai',
  '0270': 'Vĩnh Long',
  '0271': 'Bình Phước',
  '0272': 'Long An',
  '0273': 'Tiền Giang',
  '0274': 'Bình Dương',
  '0275': 'Bến Tre',
  '0276': 'Tây Ninh',
  '0277': 'Đồng Tháp',
  '0290': 'Cà Mau',
  '0291': 'Bạc Liêu',
  '0292': 'Cần Thơ',
  '0293': 'Hậu Giang',
  '0294': 'Trà Vinh',
  '0296': 'An Giang',
  '0297': 'Kiên Giang',
  '0299': 'Sóc Trăng',
};
