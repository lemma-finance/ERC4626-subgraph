import {
    User, Token, Vault,
    HourlyUserTrack, DailyUserTrack, MonthlyUserTrack,
    HourlyVolume, DailyVolume, MonthlyVolume,
    DailyAPY, WeeklyAPY, MonthlyAPY
} from '../generated/schema'
import { VAULT_ADDRESS } from './const';
import { Address, BigInt, BigDecimal, ByteArray, ethereum } from '@graphprotocol/graph-ts';
import { convertToDecimal, ZERO_BD, BI_18, ONE_BD } from "./utils";


export function updateRolledUpData(event: ethereum.Event, id: string): void {
    let usdl = Token.load(id)
    if (usdl === null) {
        usdl = new Token(id)
    }
    let vault = Vault.load(id)
    if (vault === null) {
        vault = new Vault(id)
        vault.pricePerShare = ONE_BD
        vault.name = "xUSDL"
    }

    let timestamp = event.block.timestamp.toI32()

    // Hourly
    let hourIndex = calcHourId(timestamp, id)// get unique hour within unix history
    let hourlyVolume = HourlyVolume.load(hourIndex.toString())
    if (hourlyVolume === null) {
        hourlyVolume = new HourlyVolume(hourIndex.toString())
    }

    // Daily
    let dayIndex = calcDayId(timestamp, id)  // rounded
    let dailyVolume = DailyVolume.load(dayIndex.toString())
    if (dailyVolume === null) {
        dailyVolume = new DailyVolume(dayIndex.toString())
    }

    // Monthly
    let monthIndex = calcMonthId(timestamp, id) // rounded
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


export function updateUserRolledUpData(event: ethereum.Event, user: User, id: string): void {
    let timestamp = event.block.timestamp.toI32()

    // Hourly
    let hourIndex = calcHourId(timestamp, id) // get unique hour within unix history
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
    hourlyUserTrack.hourlyVaultBalance = user.vaultBalance
    hourlyUserTrack.save()

    // Daily
    let dayIndex = calcDayId(timestamp, id)  // rounded
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
    let monthIndex = calcMonthId(timestamp, id) // rounded
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
export function updateAPYRolledUpData(event: ethereum.Event, TokenEarnings: BigDecimal, id: string): void {
    let usdl = Token.load(id)
    if (usdl === null) {
        usdl = new Token(id)
    }
    let vault = Vault.load(id)
    if (vault === null) {
        vault = new Vault(id)
        vault.pricePerShare = ONE_BD
        vault.name = "xUSDL"
    }
    let timestamp = event.block.timestamp.toI32()
    let vaultUser = User.load(Address.fromString(VAULT_ADDRESS).toHex() + "-" + id)

    // Daily APY
    // TODO: add id in the id    // new line
    let dayIndex = calcDayId(timestamp, id) // get unique daily within unix history



    let dailyAPYs = DailyAPY.load(dayIndex.toString())
    if (dailyAPYs === null) {
        dailyAPYs = new DailyAPY(dayIndex.toString())
    }
    dailyAPYs.dailyTokenEarnings = dailyAPYs.dailyTokenEarnings.plus(TokenEarnings)

    if (vaultUser !== null) {
        dailyAPYs.avgUSDEarningPerUSDL = calcAvgUSDEarningPerUSDL(dailyAPYs.avgUSDEarningPerUSDL, dailyAPYs.dailyTokenEarnings, vaultUser.tokenBalance)
        const timePerYear = BigDecimal.fromString("365");
        dailyAPYs.dailyApy =
            calcAPY(dailyAPYs.avgUSDEarningPerUSDL, timePerYear)
    }
    dailyAPYs.save()

    // Weekly APY
    let weekIndex = calcWeekId(timestamp, id) // get unique weekly within unix history
    let weeklyAPYs = WeeklyAPY.load(weekIndex.toString())
    if (weeklyAPYs === null) {
        weeklyAPYs = new WeeklyAPY(weekIndex.toString())
    }
    weeklyAPYs.weeklyTokenEarnings = weeklyAPYs.weeklyTokenEarnings.plus(TokenEarnings)

    if (vaultUser !== null) {
        weeklyAPYs.avgUSDEarningPerUSDL = calcAvgUSDEarningPerUSDL(weeklyAPYs.avgUSDEarningPerUSDL, weeklyAPYs.weeklyTokenEarnings, vaultUser.tokenBalance)
        const timePerYear = BigDecimal.fromString("52.1429");
        weeklyAPYs.weeklyApy =
            calcAPY(weeklyAPYs.avgUSDEarningPerUSDL, timePerYear)
    }
    weeklyAPYs.save()

    // Monthly APY
    let monthIndex = calcMonthId(timestamp, id) // get unique monthly within unix history
    let monthlyAPYs = MonthlyAPY.load(monthIndex.toString())
    if (monthlyAPYs === null) {
        monthlyAPYs = new MonthlyAPY(monthIndex.toString())
    }
    monthlyAPYs.monthlyTokenEarnings = monthlyAPYs.monthlyTokenEarnings.plus(TokenEarnings)

    if (vaultUser !== null) {
        monthlyAPYs.avgUSDEarningPerUSDL = calcAvgUSDEarningPerUSDL(monthlyAPYs.avgUSDEarningPerUSDL, monthlyAPYs.monthlyTokenEarnings, vaultUser.tokenBalance)
        const timePerYear = BigDecimal.fromString("12");
        monthlyAPYs.monthlyApy =
            calcAPY(monthlyAPYs.avgUSDEarningPerUSDL, timePerYear)
    }
    monthlyAPYs.save()

}

function calcAPY(avgUSDEarningPerUSDL: BigDecimal, timePerYear: BigDecimal): BigDecimal {
    return avgUSDEarningPerUSDL.times(BigDecimal.fromString('100')).times(timePerYear)
}
function calcAvgUSDEarningPerUSDL(avgUSDEarningPerUSDL: BigDecimal, totalTokenEarnings: BigDecimal, usdlBalanceForXusdlContract: BigDecimal): BigDecimal {
    if (avgUSDEarningPerUSDL === ZERO_BD) {
        avgUSDEarningPerUSDL = totalTokenEarnings.div(usdlBalanceForXusdlContract)
    } else {
        avgUSDEarningPerUSDL =
            avgUSDEarningPerUSDL
                .plus(totalTokenEarnings.div(usdlBalanceForXusdlContract))
                .div(BigDecimal.fromString('2'))
    }
    return avgUSDEarningPerUSDL;

}
function calcHourId(timestamp: number, id: string): string {
    return calcIntervalId(timestamp, 3600, id)
}
function calcDayId(timestamp: number, id: string): string {
    return calcIntervalId(timestamp, 86400, id)
}
function calcWeekId(timestamp: number, id: string): string {
    return calcIntervalId(timestamp, 604800, id)
}
function calcMonthId(timestamp: number, id: string): string {
    return calcIntervalId(timestamp, 2592000, id)
}
function calcIntervalId(timestamp: number, interval: number, id: string): string {
    return (timestamp - timestamp % interval).toString() + "-" + id
}

