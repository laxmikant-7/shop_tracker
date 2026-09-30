export const toPaise = (rupees) => Math.round(Number(rupees) * 100);
export const toRupees = (paise) => paise / 100;