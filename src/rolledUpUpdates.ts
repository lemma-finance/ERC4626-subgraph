import {
    User, Token, Vault,
    HourlyUserTrack, DailyUserTrack, MonthlyUserTrack,
    HourlyVolume, DailyVolume, MonthlyVolume,
    DailyAPY, WeeklyAPY, MonthlyAPY
} from '../generated/schema'
import { Address, BigInt, BigDecimal, ByteArray, ethereum } from '@graphprotocol/graph-ts';
import { convertToDecimal, ZERO_BD, BI_18, ONE_BD } from "./utils";
import {tokens,vaults,tokenNames} from "./const";


export function updateRolledUpData(event: ethereum.Event, id: string): void {
    let vault = Vault.load(id)
    if (vault === null) {
        vault = new Vault(id)
        vault.pricePerShare = ONE_BD
        vault.name = "Not Possible"
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
    dailyUserTrack.dailyVaultBalance = user.vaultBalance
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
    monthlyUserTrack.monthlyVaultBalance = user.vaultBalance
    monthlyUserTrack.save()
}
export function updateAPYRolledUpData(event: ethereum.Event, TokenEarnings: BigDecimal, id: string): void {
    let vault = Vault.load(id)
    if (vault === null) {
        vault = new Vault(id)
        vault.pricePerShare = ONE_BD
        vault.name = "Not Possible"
    }
    let timestamp = event.block.timestamp.toI32()
    const index = BigInt.fromString(id);
    let vaultUser = User.load(Address.fromString(vaults[index.toI32()]).toHex() + "-" + id)

    // Daily APY
    let dayIndex = calcDayId(timestamp, id) // get unique daily within unix history



    let dailyAPYs = DailyAPY.load(dayIndex.toString())
    if (dailyAPYs === null) {
        dailyAPYs = new DailyAPY(dayIndex.toString())
    }
    dailyAPYs.dailyTokenEarnings = dailyAPYs.dailyTokenEarnings.plus(TokenEarnings)

    if (vaultUser !== null) {
        dailyAPYs.avgTokenEarningsPerToken = calcAvgTokenEarningsPerToken(dailyAPYs.avgTokenEarningsPerToken, dailyAPYs.dailyTokenEarnings, vaultUser.tokenBalance)
        const timePerYear = BigDecimal.fromString("365");
        dailyAPYs.dailyApy =
            calcAPY(dailyAPYs.avgTokenEarningsPerToken, timePerYear)
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
        weeklyAPYs.avgTokenEarningsPerToken = calcAvgTokenEarningsPerToken(weeklyAPYs.avgTokenEarningsPerToken, weeklyAPYs.weeklyTokenEarnings, vaultUser.tokenBalance)
        const timePerYear = BigDecimal.fromString("52.1429");
        weeklyAPYs.weeklyApy =
            calcAPY(weeklyAPYs.avgTokenEarningsPerToken, timePerYear)
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
        monthlyAPYs.avgTokenEarningsPerToken = calcAvgTokenEarningsPerToken(monthlyAPYs.avgTokenEarningsPerToken, monthlyAPYs.monthlyTokenEarnings, vaultUser.tokenBalance)
        const timePerYear = BigDecimal.fromString("12");
        monthlyAPYs.monthlyApy =
            calcAPY(monthlyAPYs.avgTokenEarningsPerToken, timePerYear)
    }
    monthlyAPYs.save()

}

function calcAPY(avgTokenEarningsPerToken: BigDecimal, timePerYear: BigDecimal): BigDecimal {
    return avgTokenEarningsPerToken.times(BigDecimal.fromString('100')).times(timePerYear)
}
function calcAvgTokenEarningsPerToken(avgTokenEarningsPerToken: BigDecimal, totalTokenEarnings: BigDecimal, tokenBalanceForVaultContract: BigDecimal): BigDecimal {
    if (avgTokenEarningsPerToken === ZERO_BD) {
        avgTokenEarningsPerToken = totalTokenEarnings.div(tokenBalanceForVaultContract)
    } else {
        avgTokenEarningsPerToken =
            avgTokenEarningsPerToken
                .plus(totalTokenEarnings.div(tokenBalanceForVaultContract))
                .div(BigDecimal.fromString('2'))
    }
    return avgTokenEarningsPerToken;

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

