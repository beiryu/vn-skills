/** A valid sample invoice to start from. */
export function exampleInvoice() {
  return {
    series: '1C25TAA',
    issueDate: '2025-10-15',
    currency: 'VND',
    seller: {
      name: 'Công ty TNHH Ví dụ',
      taxId: '0100233488',
      address: '12 Phố Tràng Tiền, Phường Hoàn Kiếm, Thành phố Hà Nội',
      email: 'ketoan@example.com',
    },
    buyer: {
      name: 'Công ty CP Khách hàng',
      taxId: '0314409058',
      address: '1 Đường Nguyễn Huệ, Phường Sài Gòn, Thành phố Hồ Chí Minh',
    },
    lines: [
      {
        name: 'Dịch vụ tư vấn phần mềm',
        unit: 'giờ',
        quantity: 10,
        unitPrice: 500000,
        vatRate: 10,
      },
      {
        name: 'Máy chủ ảo (tháng 10/2025)',
        unit: 'tháng',
        quantity: 1,
        unitPrice: 2000000,
        vatRate: 8,
      },
    ],
    paymentMethod: 'Chuyển khoản',
    note: 'Thanh toán trong 15 ngày',
  };
}
