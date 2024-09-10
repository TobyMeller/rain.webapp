"use client";

import { useQuery } from "@tanstack/react-query";
import { getOrders } from "../_queries/getOrders";
import { useAccount } from "wagmi";
import { useEffect } from "react";
import { Spinner, Table } from "flowbite-react";
import { formatTimestampSecondsAsLocal } from "../_services/dates";
import { formatUnits } from "viem";
import { useRouter } from "next/navigation";
import { WithdrawalModal } from "../_components/WithdrawalModal";

export function TokenAndBalance({
  input,
  withdraw,
}: {
  input: any;
  withdraw?: boolean;
}) {
  return (
    <div className="flex border rounded-xl p-2 gap-x-3 items-center justify-between">
      <div className="flex flex-col gap-y-1">
        <div>{withdraw ? input.token.name : input.token.symbol}</div>
        <div className="text-gray-500">
          Balance:{" "}
          {Number(
            Number(formatUnits(input.balance, input.token.decimals)).toFixed(8)
          )}
        </div>
      </div>
      {withdraw && <WithdrawalModal vault={input} />}
    </div>
  );
}

export default function MyStrategies() {
  const router = useRouter();
  const account = useAccount();
  const query = useQuery({
    queryKey: [account.address],
    queryFn: () =>
      getOrders(
        "https://api.goldsky.com/api/public/project_clv14x04y9kzi01saerx7bxpg/subgraphs/ob4-flare/0.2/gn",
        account?.address
      ),
    enabled: !!account.address,
    refetchInterval: 10000,
  });

  return (
    <div className="flex-grow w-full flex flex-col items-start justify-items-start p-8 container">
      <h1 className="text-2xl font-semibold mb-4">My Strategies</h1>
      {!account.isConnected && (
        <div>Connect your wallet to view your strategies.</div>
      )}
      <Spinner className={query.isLoading ? "visible" : "hidden"} />
      {query.isError && <div>Error: {query.error.message}</div>}
      {query.data && (
        <div className="w-full overflow-x-scroll">
          <Table hoverable striped>
            <Table.Head>
              <Table.HeadCell>Network</Table.HeadCell>
              <Table.HeadCell>Active</Table.HeadCell>
              <Table.HeadCell>Time Added</Table.HeadCell>
              <Table.HeadCell>Inputs</Table.HeadCell>
              <Table.HeadCell>Outputs</Table.HeadCell>
              <Table.HeadCell>Trades</Table.HeadCell>
            </Table.Head>
            <Table.Body>
              {query.data.map((order: any, i: number) => (
                <Table.Row
                  key={i}
                  onClick={() => {
                    router.push(
                      `${window.location.origin}/my-strategies/${order.addEvents[0].transaction.id}`
                    );
                  }}
                >
                  <Table.Cell>{order.network}</Table.Cell>
                  <Table.Cell>
                    {order.active ? (
                      <div className="text-emerald-500">Active</div>
                    ) : (
                      <div className="text-red-500">Inactive</div>
                    )}
                  </Table.Cell>
                  <Table.Cell>
                    {formatTimestampSecondsAsLocal(
                      BigInt(order.timestampAdded)
                    )}
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex gap-x-2">
                      {order.inputs.map((input: any) => (
                        <TokenAndBalance input={input} />
                      ))}
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex gap-x-2">
                      {order.outputs.map((output: any) => (
                        <TokenAndBalance input={output} />
                      ))}
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    {order.trades.length == "1000"
                      ? ">999"
                      : order.trades.length}
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </div>
      )}
    </div>
  );
}
