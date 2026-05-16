import { NextRequest, NextResponse } from "next/server"

// Etherscan API endpoints for different networks
const NETWORK_APIS = {
  eth: {
    api: "https://api.etherscan.io/api",
    apiKey: process.env.ETHERSCAN_API_KEY || "",
  },
  bsc: {
    api: "https://api.bscscan.com/api",
    apiKey: process.env.BSCSCAN_API_KEY || "",
  },
  polygon: {
    api: "https://api.polygonscan.com/api",
    apiKey: process.env.POLYGONSCAN_API_KEY || "",
  },
}

// USDT Contract Addresses
const USDT_CONTRACTS = {
  eth: "0xdAC17F958D2ee523a2206206994597C13D831ec7", // USDT ERC20
  bsc: "0x55d398326f99059fF775485246999027B3197955", // USDT BEP20
}

interface TokenTransaction {
  hash: string
  from: string
  to: string
  value: string
  tokenDecimal: string
  confirmations: string
  timeStamp: string
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const address = searchParams.get("address")
  const network = searchParams.get("network") || "eth"
  const expectedAmount = searchParams.get("amount")
  const fromTimestamp = searchParams.get("fromTimestamp")

  if (!address) {
    return NextResponse.json({ error: "Address is required" }, { status: 400 })
  }

  const networkConfig = NETWORK_APIS[network as keyof typeof NETWORK_APIS]
  if (!networkConfig) {
    return NextResponse.json({ error: "Unsupported network" }, { status: 400 })
  }

  try {
    // Check for USDT (ERC20/BEP20) token transfers
    const tokenTransferUrl = `${networkConfig.api}?module=account&action=tokentx&address=${address}&contractaddress=${USDT_CONTRACTS[network as keyof typeof USDT_CONTRACTS]}&sort=desc&apikey=${networkConfig.apiKey}`

    const tokenResponse = await fetch(tokenTransferUrl)
    const tokenData = await tokenResponse.json()

    if (tokenData.status === "1" && tokenData.result.length > 0) {
      const transactions: TokenTransaction[] = tokenData.result

      // Filter transactions to the deposit address and after the timestamp
      const relevantTxs = transactions.filter((tx) => {
        const isToAddress = tx.to.toLowerCase() === address.toLowerCase()
        const isAfterTimestamp = fromTimestamp
          ? parseInt(tx.timeStamp) >= parseInt(fromTimestamp)
          : true

        // Check if amount matches (with tolerance for gas)
        if (expectedAmount) {
          const txAmount = parseFloat(tx.value) / Math.pow(10, parseInt(tx.tokenDecimal))
          const expected = parseFloat(expectedAmount)
          const tolerance = expected * 0.01 // 1% tolerance
          const amountMatches = Math.abs(txAmount - expected) <= tolerance
          return isToAddress && isAfterTimestamp && amountMatches
        }

        return isToAddress && isAfterTimestamp
      })

      if (relevantTxs.length > 0) {
        const latestTx = relevantTxs[0]
        const confirmations = parseInt(latestTx.confirmations)
        const amount = parseFloat(latestTx.value) / Math.pow(10, parseInt(latestTx.tokenDecimal))

        return NextResponse.json({
          found: true,
          confirmed: confirmations >= 12, // 12 confirmations for security
          transaction: {
            hash: latestTx.hash,
            from: latestTx.from,
            to: latestTx.to,
            amount: amount.toFixed(2),
            confirmations,
            timestamp: new Date(parseInt(latestTx.timeStamp) * 1000).toISOString(),
          },
        })
      }
    }

    // Also check for native ETH/BNB transfers
    const ethTransferUrl = `${networkConfig.api}?module=account&action=txlist&address=${address}&sort=desc&apikey=${networkConfig.apiKey}`

    const ethResponse = await fetch(ethTransferUrl)
    const ethData = await ethResponse.json()

    if (ethData.status === "1" && ethData.result.length > 0) {
      const transactions = ethData.result

      const relevantTxs = transactions.filter((tx: any) => {
        const isToAddress = tx.to.toLowerCase() === address.toLowerCase()
        const isAfterTimestamp = fromTimestamp
          ? parseInt(tx.timeStamp) >= parseInt(fromTimestamp)
          : true
        const hasValue = parseFloat(tx.value) > 0

        return isToAddress && isAfterTimestamp && hasValue
      })

      if (relevantTxs.length > 0) {
        const latestTx = relevantTxs[0]
        const confirmations = parseInt(latestTx.confirmations)
        const amount = parseFloat(latestTx.value) / 1e18 // Convert from Wei

        return NextResponse.json({
          found: true,
          confirmed: confirmations >= 12,
          transaction: {
            hash: latestTx.hash,
            from: latestTx.from,
            to: latestTx.to,
            amount: amount.toFixed(6),
            confirmations,
            timestamp: new Date(parseInt(latestTx.timeStamp) * 1000).toISOString(),
            isNative: true,
          },
        })
      }
    }

    return NextResponse.json({
      found: false,
      confirmed: false,
      message: "No matching transaction found",
    })
  } catch (error) {
    console.error("Error checking deposit:", error)
    return NextResponse.json(
      { error: "Failed to check deposit status" },
      { status: 500 }
    )
  }
}
