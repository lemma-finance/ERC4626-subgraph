import {
    User, Token, ERC4626,
    HourlyUserTrack, DailyUserTrack, MonthlyUserTrack,
    HourlyVolume, DailyVolume, MonthlyVolume,
    DailyAPY, WeeklyAPY, MonthlyAPY
} from '../generated/schema'
import { VAULT_ADDRESS } from './const';
import { Address, BigInt, BigDecimal, ByteArray, ethereum } from '@graphprotocol/graph-ts';
import { convertToDecimal, ZERO_BD, BI_18, ONE_BD } from "./utils";


export function updateRolledUpData(event: ethereum.Event): void {
    const usdlId = "3";
    let usdl = Token.load(usdlId)
    if (usdl === null) {
        usdl = new Token(usdlId)
    }
    let vault = ERC4626.load(usdlId)
    if (vault === null) {
        vault = new ERC4626(usdlId)
        vault.pricePerShare = ONE_BD
    }

    let timestamp = event.block.timestamp.toI32()

    // Hourly
    let hourIndex = calcHourId(timestamp)// get unique hour within unix history
    let hourlyVolume = HourlyVolume.load(hourIndex.toString())
    if (hourlyVolume === null) {
        hourlyVolume = new HourlyVolume(hourIndex.toString())
    }

    // Daily
    let dayIndex = calcDayId(timestamp) // rounded
    let dailyVolume = DailyVolume.load(dayIndex.toString())
    if (dailyVolume === null) {
        dailyVolume = new DailyVolume(dayIndex.toString())
    }

    // Monthly
    let monthIndex = calcMonthId(timestamp) // rounded
    let monthlyVolume = MonthlyVolume.load(monthIndex.toString())
    if (monthlyVolume === null) {
        monthlyVolume = new MonthlyVolume(monthIndex.toString())
    }


    hourlyVolume.hourlyVaultTotalSupply = vault.totalSupply
    dailyVolume.dailyVaultTotalSupply = vault.totalSupply
    monthlyVolume.monthlyVaultTotalSupply = vault.totalSupply

    hourlyVolume.hourlyPricePerShare = vault.pricePerShare
    dailyVolume.dailyPricePerShare = vault.pricePerShare
    monthlyVolume.monthlyPricePerShare = vault.pricePerShare

    hourlyVolume.save()
    dailyVolume.save()
    monthlyVolume.save()
}

export function updateUserRolledUpData(event: ethereum.Event, user: User): void {
    let timestamp = event.block.timestamp.toI32()

    // Hourly
    let hourIndex = calcHourId(timestamp) // get unique hour within unix history
    let userHourID = user.id
        .toString()
        .concat('-')
        .concat(hourIndex.toString())
    let hourlyUserTrack = HourlyUserTrack.load(userHourID.toString())
    if (hourlyUserTrack === null) {
        hourlyUserTrack = new HourlyUserTrack(userHourID.toString())
    }
    hourlyUserTrack.user = user.id
    hourlyUserTrack.hourlyEntryValue = user.entryValue
    hourlyUserTrack.hourlyXusdlBalance = user.vaultBalance
    hourlyUserTrack.save()

    // Daily
    let dayIndex = calcDayId(timestamp) // rounded
    let userDailyID = user.id
        .toString()
        .concat('-')
        .concat(dayIndex.toString())
    let dailyUserTrack = DailyUserTrack.load(userDailyID.toString())
    if (dailyUserTrack === null) {
        dailyUserTrack = new DailyUserTrack(userDailyID.toString())
    }
    dailyUserTrack.user = user.id
    dailyUserTrack.dailyEntryValue = user.entryValue
    dailyUserTrack.dailyXusdlBalance = user.vaultBalance
    dailyUserTrack.save()

    // montly
    let monthIndex = calcMonthId(timestamp) // rounded
    let userMonthlyID = user.id
        .toString()
        .concat('-')
        .concat(monthIndex.toString())
    let monthlyUserTrack = MonthlyUserTrack.load(userMonthlyID.toString())
    if (monthlyUserTrack === null) {
        monthlyUserTrack = new MonthlyUserTrack(userMonthlyID.toString())
    }
    monthlyUserTrack.user = user.id
    monthlyUserTrack.monthlyEntryValue = user.entryValue
    monthlyUserTrack.monthlyXusdlBalance = user.vaultBalance
    monthlyUserTrack.save()
}
export function updateAPYRolledUpData(event: ethereum.Event, usdEarnings: BigDecimal): void {
    const usdlId = "3";
    let usdl = Token.load(usdlId)
    if (usdl === null) {
        usdl = new Token(usdlId)
    }
    let vault = ERC4626.load(usdlId)
    if (vault === null) {
        vault = new ERC4626(usdlId)
        vault.pricePerShare = ONE_BD
    }
    let timestamp = event.block.timestamp.toI32()
    let vaultUser = User.load(Address.fromString(VAULT_ADDRESS).toHex() + "-" + vaultId)

    // Daily APY
    let dayIndex = calcDayId(timestamp) // get unique daily within unix history
    let dailyAPYs = DailyAPY.load(dayIndex.toString())
    if (dailyAPYs === null) {
        dailyAPYs = new DailyAPY(dayIndex.toString())
    }
    dailyAPYs.dailyUSDEarnings = dailyAPYs.dailyUSDEarnings.plus(usdEarnings)

    if (vaultUser !== null) {
        dailyAPYs.avgUSDEarningPerUSDL = calcAvgUSDEarningPerUSDL(dailyAPYs.avgUSDEarningPerUSDL, dailyAPYs.dailyUSDEarnings, vaultUser.usdLBalance)
        const timePerYear = BigDecimal.fromString("365");
        dailyAPYs.dailyApy =
            calcAPY(dailyAPYs.avgUSDEarningPerUSDL, timePerYear)
    }
    dailyAPYs.save()

    // Weekly APY
    let weekIndex = calcWeekId(timestamp) // get unique weekly within unix history
    let weeklyAPYs = WeeklyAPY.load(weekIndex.toString())
    if (weeklyAPYs === null) {
        weeklyAPYs = new WeeklyAPY(weekIndex.toString())
    }
    weeklyAPYs.weeklyUSDEarnings = weeklyAPYs.weeklyUSDEarnings.plus(usdEarnings)

    if (vaultUser !== null) {
        weeklyAPYs.avgUSDEarningPerUSDL = calcAvgUSDEarningPerUSDL(weeklyAPYs.avgUSDEarningPerUSDL, weeklyAPYs.weeklyUSDEarnings, vaultUser.usdLBalance)
        const timePerYear = BigDecimal.fromString("52.1429");
        weeklyAPYs.weeklyApy =
            calcAPY(weeklyAPYs.avgUSDEarningPerUSDL, timePerYear)
    }
    weeklyAPYs.save()

    // Monthly APY
    let monthIndex = calcMonthId(timestamp) // get unique monthly within unix history
    let monthlyAPYs = MonthlyAPY.load(monthIndex.toString())
    if (monthlyAPYs === null) {
        monthlyAPYs = new MonthlyAPY(monthIndex.toString())
    }
    monthlyAPYs.monthlyUSDEarnings = monthlyAPYs.monthlyUSDEarnings.plus(usdEarnings)

    if (vaultUser !== null) {
        monthlyAPYs.avgUSDEarningPerUSDL = calcAvgUSDEarningPerUSDL(monthlyAPYs.avgUSDEarningPerUSDL, monthlyAPYs.monthlyUSDEarnings, vaultUser.usdLBalance)
        const timePerYear = BigDecimal.fromString("12");
        monthlyAPYs.monthlyApy =
            calcAPY(monthlyAPYs.avgUSDEarningPerUSDL, timePerYear)
    }
    monthlyAPYs.save()

}

function calcAPY(avgUSDEarningPerUSDL: BigDecimal, timePerYear: BigDecimal): BigDecimal {
    return avgUSDEarningPerUSDL.times(BigDecimal.fromString('100')).times(timePerYear)
}
function calcAvgUSDEarningPerUSDL(avgUSDEarningPerUSDL: BigDecimal, USDEarnings: BigDecimal, usdlBalanceForXusdlContract: BigDecimal): BigDecimal {
    if (avgUSDEarningPerUSDL === ZERO_BD) {
        avgUSDEarningPerUSDL = USDEarnings.div(usdlBalanceForXusdlContract)
    } else {
        avgUSDEarningPerUSDL =
            avgUSDEarningPerUSDL
                .plus(USDEarnings.div(usdlBalanceForXusdlContract))
                .div(BigDecimal.fromString('2'))
    }
    return avgUSDEarningPerUSDL;

}
function calcHourId(timestamp: number): number {
    return calcIntervalId(timestamp, 3600)
}
function calcDayId(timestamp: number): number {
    return calcIntervalId(timestamp, 86400)
}
function calcWeekId(timestamp: number): number {
    return calcIntervalId(timestamp, 604800)
}
function calcMonthId(timestamp: number): number {
    return calcIntervalId(timestamp, 2592000)
}
function calcIntervalId(timestamp: number, interval: number): number {
    return timestamp - timestamp % interval
}

