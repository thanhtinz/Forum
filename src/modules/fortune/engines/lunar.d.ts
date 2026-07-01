// lunar-javascript không kèm type — khai báo tối thiểu phần dùng.
declare module 'lunar-javascript' {
  export const Solar: {
    fromYmdHms(y: number, m: number, d: number, h: number, mi: number, s: number): any;
    fromYmd(y: number, m: number, d: number): any;
  };
  export const Lunar: any;
  export const LunarUtil: any;
}
