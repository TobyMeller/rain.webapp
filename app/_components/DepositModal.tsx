'use client';
import { config } from '../providers';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useEffect, useState } from 'react';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from '@/components/ui/dialog';
import { useWriteContract, useReadContract, useAccount } from 'wagmi';
import { orderBookJson } from '@/public/_abis/OrderBook';
import { parseUnits, formatUnits, erc20Abi } from 'viem';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { readContract } from 'viem/actions';
import { waitForTransactionReceipt } from '@wagmi/core';

const ERC20_ABI = [
	{
		constant: true,
		inputs: [{ name: 'owner', type: 'address' }],
		name: 'balanceOf',
		outputs: [{ name: '', type: 'uint256' }],
		type: 'function'
	}
];

const formSchema = z.object({
	depositAmount: z.preprocess(
		(value) => Number(value),
		z.number().min(0, 'Amount must be a positive number')
	)
});

interface Vault {
	token: any;
	vaultId: any;
	orderbook: any;
}

interface DepositModalProps {
	vault: Vault;
}

export const DepositModal = ({ vault }: DepositModalProps) => {
	const { writeContractAsync } = useWriteContract();
	const [open, setOpen] = useState(false);
	const [rawAmount, setRawAmount] = useState<string>('0');

	const [error, setError] = useState<string | null>(null);
	const [connectedWalletBalance, setConnectedWalletBalance] = useState<BigInt | null>(null);

	useEffect(() => {
		if (!open) {
			setError(null);
		}
	}, [open]);

	const address = useAccount().address;
	const chain = useAccount().chain;

	useEffect(() => {
		const fetchBalance = async () => {
			console.log(address, chain);
			const balance = await readContract(config.getClient(), {
				abi: ERC20_ABI,
				address: vault.token.address,
				functionName: 'balanceOf',
				args: [address as `0x${string}`]
			});
			setConnectedWalletBalance(balance);
			console.log(balance);
		};
		fetchBalance();
	}, [vault.token.address, address]);

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			depositAmount: 0
		}
	});

	const deposit = async () => {
		try {
			const depositAmount = form.getValues('depositAmount').toString();
			const parsedAmount = parseUnits(depositAmount, vault.token.decimals);

			// Step 1: Check current allowance
			const existingAllowance = await readContract(config.getClient(), {
				abi: erc20Abi,
				address: vault.token.address,
				functionName: 'allowance',
				args: [address, vault.orderbook.id]
			});

			console.log(`Current allowance: ${existingAllowance}`);

			// Step 2: If allowance is insufficient, approve the necessary amount
			if (existingAllowance < parsedAmount) {
				console.log(`Insufficient allowance (${existingAllowance}), approving...`);

				const approveTx = await writeContractAsync({
					address: vault.token.address,
					abi: erc20Abi,
					functionName: 'approve',
					args: [vault.orderbook.id, parsedAmount]
				});

				console.log(`Approval transaction sent: ${approveTx.hash}`);

				// Step 3: Wait for the approval to be mined
				const receipt = await waitForTransactionReceipt(config, {
					hash: approveTx.hash,
					confirmations: 1
				});

				console.log(`Approval confirmed in block ${receipt.blockNumber}`);
			} else {
				console.log('Sufficient allowance, no approval needed.');
			}

			// Step 4: Proceed with the deposit after approval
			const depositTx = await writeContractAsync({
				abi: orderBookJson.abi,
				address: vault.orderbook.id,
				functionName: 'deposit2',
				args: [vault.token.address, BigInt(vault.vaultId), parsedAmount, []]
			});

			console.log(`Deposit transaction sent: ${depositTx}`);

			// Step 5: Optionally, wait for the deposit transaction to be mined
			const depositReceipt = await waitForTransactionReceipt(config, {
				hash: depositTx,
				confirmations: 1
			});

			console.log(`Deposit confirmed in block ${depositReceipt.blockNumber}`);
		} catch (error) {
			console.error('Error during deposit process:', error);
			return setError('Failed to deposit. Please try again.');
		}
	};

	// const deposit = async (amount: string) => {
	// 	await writeContractAsync({
	// 		abi: orderBookJson.abi,
	// 		address: vault.orderbook.id,
	// 		functionName: 'deposit2',
	// 		args: [vault.token.address, BigInt(vault.vaultId), BigInt(amount), []]
	// 	});
	// };

	const handleMaxClick = () => {
		if (connectedWalletBalance === BigInt(0)) {
			return setError('Insuficient balance');
		} else if (!connectedWalletBalance) {
			return setError('No balance found');
		}
		const userMaxBalance = connectedWalletBalance?.toString();
		const readableMaxBalance = formatUnits(BigInt(userMaxBalance), vault.token.decimals);
		form.setValue('depositAmount', parseFloat(readableMaxBalance));
		setRawAmount(userMaxBalance);
		form.setFocus('depositAmount');
	};

	const handleUserChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const userInput = e.target.value;
		form.setValue('depositAmount', parseFloat(userInput));

		if (userInput) {
			try {
				const parsedRawAmount = parseUnits(userInput, vault.token.decimals).toString();
				setRawAmount(parsedRawAmount); // Update raw amount on every user change
			} catch (err) {
				setRawAmount('0'); // Fallback to 0 if input is invalid
			}
		} else {
			setRawAmount('0'); // Fallback to 0 if input is empty
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild={true}>
				<span
					className={cn(
						buttonVariants(),
						'bg-blue-500 hover:bg-blue-700 text-white py-2 px-4 rounded-xl transition-colors cursor-pointer'
					)}>
					Deposit
				</span>
			</DialogTrigger>
			<DialogContent className="bg-white">
				<DialogHeader>
					<DialogTitle>Deposit</DialogTitle>
					<Form {...form}>
						<form
							onSubmit={form.handleSubmit(async () => {
								await deposit(rawAmount);
							})}
							className="space-y-8">
							<FormField
								control={form.control}
								name="depositAmount"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Amount</FormLabel>
										{connectedWalletBalance && (
											<div className="text-sm text-gray-500">
												Balance: {formatUnits(connectedWalletBalance, vault.token.decimals)}
											</div>
										)}
										<FormControl>
											<Input
												placeholder="0"
												{...field}
												type="number"
												step="0.1"
												onChange={handleUserChange}
											/>
										</FormControl>
										<FormMessage>{error}</FormMessage>
										<Button size="sm" type="button" onClick={handleMaxClick}>
											Max
										</Button>
										<FormMessage />
									</FormItem>
								)}
							/>
							<Button type="submit" disabled={!!error}>
								Submit
							</Button>
						</form>
					</Form>
				</DialogHeader>
			</DialogContent>
		</Dialog>
	);
};
