"use client";
import { transactionAnalytics } from "@/app/_queries/strategyAnalytics";
import { useState } from "react";
import { formatUnits, parseUnits } from "viem";
import { YamlData } from "@/app/_types/yamlData";
import { useWriteContract } from "wagmi";
import { orderBookJson } from "@/public/_abis/OrderBook";

interface props {
  transactionId: string;
  yamlData: YamlData;
}

const StrategyAnalytics = ({ transactionId, yamlData }: props) => {
  const [transactionAnalyticsData, setTransactionAnalyticsData] =
    useState<any>();
  const { writeContractAsync } = useWriteContract();

  const getTransactionAnalyticsData = async () => {
    // Find which subgraph has the transaction data by checking each subgraph
    for (let subgraphUrl of Object.values(yamlData.subgraphs)) {
      try {
        const response = await fetch(subgraphUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: transactionAnalytics(transactionId),
          }),
        });
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const result = await response.json();
        setTransactionAnalyticsData(result);
      } catch (error) {}
    }
  };
  if (transactionAnalyticsData === undefined) {
    getTransactionAnalyticsData();
  }

  const withdraw = async (token: any, vaultId: string, amount: number) => {
    const orderBookAddress =
      transactionAnalyticsData?.data?.events[0]?.order.orderbook.id;
    await writeContractAsync({
      address: orderBookAddress,
      abi: orderBookJson.abi,
      functionName: "withdraw2",
      args: [
        token.address,
        vaultId,
        parseUnits(String(amount), token.decimals),
        [],
      ],
    });
  };

  const order = transactionAnalyticsData?.data?.events[0]?.order;
  const totalTradeCount = order?.trades.length;
  const inputVaults = order?.inputs.reduce((acc: any, vault: any) => {
    acc[vault.token.name] = order.trades.reduce(
      (acc: any, trade: any) => {
        if (
          trade.inputVaultBalanceChange.vault.token.name === vault.token.name
        ) {
          acc.totalIn =
            (acc.totalIn || 0) + Number(trade.inputVaultBalanceChange.amount);
        }
        return acc;
      },
      {
        decimals: vault.token.decimals,
        balance: vault.balance,
        address: vault.token.address,
        vaultId: vault.vaultId,
        totalIn: 0,
      }
    );

    return acc;
  }, {});
  const outputVaults = order?.outputs.reduce((acc: any, vault: any) => {
    acc[vault.token.name] = order.trades.reduce(
      (acc: any, trade: any) => {
        if (
          trade.outputVaultBalanceChange.vault.token.name === vault.token.name
        ) {
          acc.totalOut =
            (acc.totalOut || 0) +
            Math.abs(Number(trade.outputVaultBalanceChange.amount));
        }
        return acc;
      },
      {
        decimals: vault.token.decimals,
        balance: vault.balance,
        address: vault.token.address,
        vaultId: vault.vaultId,
        totalOut: 0,
      }
    );

    return acc;
  }, {});

  return (
    <div className="p-4">
      {totalTradeCount !== undefined && (
        <h1>
          <span className="font-bold">Number of trades:</span> {totalTradeCount}
        </h1>
      )}
      {inputVaults && (
        <div className="py-2">
          <h2 className="underline">Input Vaults</h2>
          {Object.keys(inputVaults).map((token: any) => (
            <div key={token}>
              <h3 className="font-semibold">{token}</h3>
              <p>
                <span className="font-medium">Total In:</span>{" "}
                {formatUnits(
                  inputVaults[token].totalIn,
                  inputVaults[token].decimals
                )}
              </p>
              <p>
                <span className="font-medium">Balance:</span>{" "}
                {formatUnits(
                  inputVaults[token].balance,
                  inputVaults[token].decimals
                )}
                <button
                  className="bg-gray-500 hover:bg-gray-400 text-white font-bold px-2 mx-1 rounded"
                  onClick={() =>
                    withdraw(
                      inputVaults[token],
                      inputVaults[token].vaultId,
                      inputVaults[token].balance
                    )
                  }
                >
                  Withdraw all
                </button>
              </p>
            </div>
          ))}
        </div>
      )}
      {outputVaults && (
        <div className="py-2">
          <h2 className="underline">Output Vaults</h2>
          {Object.keys(outputVaults).map((token: any) => (
            <div key={token}>
              <h3 className="font-semibold">{token}</h3>
              <p>
                <span className="font-medium">Total Out:</span>{" "}
                {formatUnits(
                  outputVaults[token].totalOut,
                  outputVaults[token].decimals
                )}
              </p>
              <p>
                <span className="font-medium">Balance:</span>{" "}
                {formatUnits(
                  outputVaults[token].balance,
                  outputVaults[token].decimals
                )}
                <button
                  className="bg-gray-500 hover:bg-gray-400 text-white font-bold px-2 mx-1 rounded"
                  onClick={() =>
                    withdraw(
                      outputVaults[token],
                      outputVaults[token].vaultId,
                      inputVaults[token].balance
                    )
                  }
                >
                  Withdraw all
                </button>
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StrategyAnalytics;
