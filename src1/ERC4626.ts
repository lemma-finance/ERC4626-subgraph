import { Deposit, Withdraw, Transfer } from '../generated/ERC4626/ERC4626'
import { ERC4626, User, HourlyUserTrack, DailyUserTrack, HourlyVolume, DailyVolume, MonthlyVolume } from '../generated/schema'
import { Address, BigInt, BigDecimal, ByteArray } from '@graphprotocol/graph-ts';
import { convertToDecimal, ZERO_BD, BI_18, ONE_BD } from "./utils";
import { VAULT_ADDRESS } from './const';
import { updateRolledUpData, updateUserRolledUpData } from './rolledUpUpdates';

export function handleDeposit(event: Deposit): void {
    const vaultId = "2";
    let vault = ERC4626.load(vaultId)
    if (vault === null) {
        vault = new ERC4626(vaultId)
        vault.pricePerShare = ONE_BD
    }
    let user = User.load(event.params.owner.toHex() + "-" + vaultId)
    if (user === null) {
        user = new User(event.params.owner.toHex())
    }


    //this changes pricePerShare after entryValue is calculated
    if (vault.totalSupply.notEqual(ZERO_BD)) {
        let vaultUser = User.load(Address.fromString(VAULT_ADDRESS).toHex() + "-" + vaultId)
        if (vaultUser !== null) {
            let pricePerShare = vaultUser.tokenBalance.div(vault.totalSupply)
            vault.pricePerShare = pricePerShare
        }
    }
    vault.save()
    updateRolledUpData(event)
}
export function handleWithdraw(event: Withdraw): void {
    const vaultId = "2";
    let vault = ERC4626.load(vaultId)
    if (vault === null) {
        vault = new ERC4626(vaultId)
        vault.pricePerShare = ONE_BD
    }
    //this changes pricePerShare after entryValue is calculated
    if (vault.totalSupply.notEqual(ZERO_BD)) {
        let vaultUser = User.load(Address.fromString(VAULT_ADDRESS).toHex() + "-" + vaultId)
        if (vaultUser !== null) {
            let pricePerShare = vaultUser.tokenBalance.div(vault.totalSupply)
            vault.pricePerShare = pricePerShare
        }
    }
    vault.save()
    updateRolledUpData(event)
}


export function handleTransfer(event: Transfer): void {
    const vaultId = "2";
    let vault = ERC4626.load(vaultId)
    if (vault === null) {
        vault = new ERC4626(vaultId)
        vault.pricePerShare = ONE_BD
    }
    const valueInBD = convertToDecimal(event.params.amount, BI_18)

    //mint
    if (event.params.from == Address.zero()) {
        let userTo = User.load(event.params.to.toHex())
        if (userTo === null) {
            userTo = new User(event.params.to.toHex())
        }
        userTo.vaultBalance = userTo.vaultBalance.plus(valueInBD)
        userTo.entryValue = userTo.entryValue.plus(vault.pricePerShare.times(valueInBD))
        userTo.save()
        updateUserRolledUpData(event, userTo)

        vault.totalSupply = vault.totalSupply.plus(valueInBD)
        vault.save()
    }
    //burn
    else if (event.params.to == Address.zero()) {
        let userFrom = User.load(event.params.from.toHex())
        if (userFrom === null) {
            //not possible
            userFrom = new User(event.params.to.toHex())
        }

        const avgBuyPriceOfUser = userFrom.entryValue.div(valueInBD)
        userFrom.realizedEarnings = userFrom.realizedEarnings.plus((vault.pricePerShare.minus(avgBuyPriceOfUser)).times(valueInBD))
        const oldBalance = userFrom.vaultBalance
        const updatedBalance = userFrom.vaultBalance.minus(valueInBD);
        userFrom.entryValue = userFrom.entryValue.times(updatedBalance.div(oldBalance))
        userFrom.vaultBalance = updatedBalance
        userFrom.save()
        updateUserRolledUpData(event, userFrom)

        vault.totalSupply = vault.totalSupply.minus(valueInBD);
        vault.save()
    }
    //transfer
    else {
        let userTo = User.load(event.params.to.toHex())
        if (userTo === null) {
            userTo = new User(event.params.to.toHex())
        }
        userTo.entryValue = userTo.entryValue.plus(vault.pricePerShare.times(valueInBD))
        userTo.vaultBalance = userTo.vaultBalance.plus(valueInBD)
        userTo.save()
        updateUserRolledUpData(event, userTo)


        let userFrom = User.load(event.params.from.toHex())
        if (userFrom === null) {
            //not possible
            userFrom = new User(event.params.to.toHex())
        }

        const avgBuyPriceOfUser = userFrom.entryValue.div(valueInBD)
        userFrom.realizedEarnings = userFrom.realizedEarnings.plus((vault.pricePerShare.minus(avgBuyPriceOfUser)).times(valueInBD))
        const oldFromBalance = userFrom.vaultBalance
        const updatedFromBalance = userFrom.vaultBalance.minus(valueInBD);
        userFrom.entryValue = userFrom.entryValue.times(updatedFromBalance.div(oldFromBalance))
        userFrom.vaultBalance = updatedFromBalance
        userFrom.save()
        updateUserRolledUpData(event, userFrom)
    }
    updateRolledUpData(event)
}
