/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module 'lunar-javascript' {
  export class Solar {
    static fromDate(date: Date): Solar
    static fromDate(date: Date, hour: number, minute: number, second: number): Solar
    getLunar(): Lunar
    getYear(): number
    getMonth(): number
    getDay(): number
  }
  export class Lunar {
    getYearInGanZhi(): string
    getMonthInChinese(): string
    getDayInChinese(): string
    getYearShengXiao(): string
    getPrevJieQi(): { getName(): string } | null
    getFestivals(): string[]
  }
}
