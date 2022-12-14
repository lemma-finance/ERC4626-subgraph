import { Transfer } from '../generated/Token/Token'
import {
    User, Token, Vault
} from '../generated/schema'
import { Address } from '@graphprotocol/graph-ts';
import { convertToDecimal, ZERO_BD, BI_18, ONE_BD } from "./utils";
import {tokens,vaults,tokenNames} from "./const";
import { updateAPYRolledUpData, updateRolledUpData, updateUserRolledUpData } from "./rolledUpUpdates"

export function handleTransfer(event: Transfer): void {
    let index = tokens.indexOf(event.address.toHexString())
    let id = index.toString();
    let token = Token.load(id)
    if (token === null) {
        token = new Token(id)
        token.totalSupply = ZERO_BD
        token.multiplier = ZERO_BD
        token.name = tokenNames[index];
    }
    let vault = Vault.load(id)
    if (vault === null) {
        vault = new Vault(id)
        vault.pricePerShare = ONE_BD
        vault.name = "x" + tokenNames[index];
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

        let vaultUser = User.load(Address.fromString(vaults[index]).toHex() + "-" + id)
        if (vaultUser !== null) {
            if (event.params.to.toHex() == Address.fromString(vaults[index]).toHex()) {
                let tokenEarnings = valueInBD;
                vault.totalTokenEarnings = vault.totalTokenEarnings.plus(tokenEarnings)
                vault.save();
                updateAPYRolledUpData(event, tokenEarnings, id)
            }
        }

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

        let vaultUser = User.load(Address.fromString(vaults[index]).toHex() + "-" + id)
        if (vaultUser !== null) {
            if (event.params.from.toHex() == Address.fromString(vaults[index]).toHex()) {
                let tokenEarnings = ZERO_BD.minus(valueInBD);
                vault.totalTokenEarnings = vault.totalTokenEarnings.plus(tokenEarnings)
                vault.save();
                updateAPYRolledUpData(event, tokenEarnings, id)
            }
        }
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
        let vaultUser = User.load(Address.fromString(vaults[index]).toHex() + "-" + id)
        if (vaultUser !== null) {
            token1.multiplier = token1.totalSupply.div(vaultUser.tokenBalance)
        }
        token1.save()
    }
    updateRolledUpData(event, id)
}
