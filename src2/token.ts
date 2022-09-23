//TODO: generate this automatically
import { Transfer } from '../generated/Token/Token'
import {
    User, Token,
    HourlyUserTrack, DailyUserTrack,
    HourlyVolume, DailyVolume, MonthlyVolume,
    DailyAPY, WeeklyAPY, MonthlyAPY
} from '../generated/schema'
import { Address, BigInt, BigDecimal, ByteArray } from '@graphprotocol/graph-ts';
import { convertToDecimal, ZERO_BD, BI_18, ONE_BD } from "./utils";
import { VAULT_ADDRESS } from './const';
import { updateRolledUpData, updateUserRolledUpData, updateAPYRolledUpData } from "./rolledUpUpdates"

export function handleTransfer(event: Transfer): void {

    const id = "3";
    let token = Token.load(id)
    if (token === null) {
        token = new Token(id)
        token.totalSupply = ZERO_BD
        token.multiplier = ZERO_BD
    }
    const valueInBD = convertToDecimal(event.params.amount, BI_18)

    //mint
    if (event.params.from == Address.zero()) {
        let userTo = User.load(event.params.to.toHex() + "-" + id)



        if (userTo === null) {
            userTo = new User(event.params.to.toHex() + "-" + id)

        }
        userTo.tokenBalance = userTo.tokenBalance.plus(valueInBD)
        userTo.save()
        updateUserRolledUpData(event, userTo, id)

        token.totalSupply = token.totalSupply.plus(valueInBD)
        token.save()
    }
    //burn
    else if (event.params.to == Address.zero()) {
        let userFrom = User.load(event.params.from.toHex() + "-" + id)



        if (userFrom === null) {
            //not possible
            userFrom = new User(event.params.to.toHex() + "-" + id)
            userFrom.tokenBalance = ZERO_BD
            userFrom.vaultBalance = ZERO_BD
        }
        userFrom.tokenBalance = userFrom.tokenBalance.minus(valueInBD)
        userFrom.save()
        updateUserRolledUpData(event, userFrom, id)

        token.totalSupply = token.totalSupply.minus(valueInBD)
        token.save()

    }
    //transfer
    else {
        // userTo
        let userTo = User.load(event.params.to.toHex() + "-" + id)



        if (userTo === null) {
            userTo = new User(event.params.to.toHex() + "-" + id)

        }
        userTo.tokenBalance = userTo.tokenBalance.plus(valueInBD)
        userTo.save()
        updateUserRolledUpData(event, userTo, id)

        // userFrom
        let userFrom = User.load(event.params.from.toHex() + "-" + id)



        if (userFrom === null) {
            //not possible
            userFrom = new User(event.params.to.toHex() + "-" + id)
            userFrom.tokenBalance = ZERO_BD
            userFrom.vaultBalance = ZERO_BD
        }
        userFrom.tokenBalance = userFrom.tokenBalance.minus(valueInBD)
        userFrom.save()
        updateUserRolledUpData(event, userFrom, id)
    }

    let token1 = Token.load(id);
    if (token1 !== null) {
        let vaultUser = User.load(Address.fromString(VAULT_ADDRESS).toHex() + "-" + id)
        if (vaultUser !== null) {
            token1.multiplier = token1.totalSupply.div(vaultUser.tokenBalance)
        }
        token1.save()
    }
    updateRolledUpData(event, id)
}