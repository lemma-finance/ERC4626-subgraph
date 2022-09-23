# Basis-trading-stablecoin-subgraph

## Steps for deploying lemma-subgraph locally

1). Clone Graph node repo.

    https://github.com/graphprotocol/graph-node.git

2). Opne CLI and run graph node using docker.

    cd graph-node/docker
    docker-compose up
    
3). Clone basis-trading-stablecoin repo.

    https://github.com/lemma-finance/basis-trading-stablecoin.git

    A. Setup basis-trading-stablecoin repo
    1. git submodule update --init
    2. npm install
    3. cd mai-protocol-v3/
    4. npm install

    B. Run node on basis-trading-stablecoin
    npx hardhat node --hostname 0.0.0.0

    C. Run deploy_local.js script file on basis trading stablecoin
    npx hardhat run scripts/deploy_local.js --network localDocker

    D. After running deploy_local.js script, it will print below addresses in cli and copy all the addresses.
    => Addresses = USDLemma, xUSDL, mcdexLemma
    
4). Clone basis-trading-stablecoin-subgraph repo.

    https://github.com/lemma-finance/basis-trading-stablecoin-subgraph.git
    
    A. Setup basis-trading-stablecoin-subgraph
    yarn

    B. Copy addresses from Step 3.D 
    Paste all the addresses(from 3.D => step3USDLemma, xUSDL, mcdexLemma) in config/local.json file

    C. open cli and run below commands under basis-trading-stablecoin-subgraph repo
    * yarn codegen
    * yarn create-local
    * yarn prepare:local
    * yarn deploy local

    D. After running above commands you will get subgraph deploy link, Copy URL link and paste in chrome.
    example-link:  http://127.0.0.1:8000/subgraphs/name/yashnaman/basisTradingStablecoinSubgraph/graphql

    
