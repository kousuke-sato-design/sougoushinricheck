<script lang="ts">
	import AppLayout from '$lib/components/AppLayout.svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let showAddForm = $state(false);

	const roleLabels: Record<string, string> = {
		admin: '管理者',
		member: '一般'
	};

	function formatDate(dateStr: string): string {
		const date = new Date(dateStr);
		return date.toLocaleDateString('ja-JP', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}
</script>

<AppLayout user={data.user}>
	<div class="px-4 sm:px-0">
		<div class="flex items-center justify-between mb-6">
			<h1 class="text-2xl font-bold text-gray-900">メンバー管理</h1>
			<button
				type="button"
				class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
				onclick={() => showAddForm = !showAddForm}
			>
				{showAddForm ? 'キャンセル' : 'メンバー追加'}
			</button>
		</div>

		{#if form?.error}
			<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
				{form.error}
			</div>
		{/if}

		{#if form?.success && form?.action === 'add'}
			<div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
				メンバーを追加しました
			</div>
		{/if}

		<!-- Add Member Form -->
		{#if showAddForm}
			<div class="bg-white shadow rounded-lg p-6 mb-6">
				<h2 class="text-lg font-medium text-gray-900 mb-4">新規メンバー追加</h2>
				<form method="POST" action="?/add" class="space-y-4">
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label for="name" class="block text-sm font-medium text-gray-700 mb-1">
								名前
							</label>
							<input
								type="text"
								id="name"
								name="name"
								required
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
						</div>
						<div>
							<label for="email" class="block text-sm font-medium text-gray-700 mb-1">
								メールアドレス
							</label>
							<input
								type="email"
								id="email"
								name="email"
								required
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
						</div>
						<div>
							<label for="password" class="block text-sm font-medium text-gray-700 mb-1">
								パスワード（8文字以上）
							</label>
							<input
								type="password"
								id="password"
								name="password"
								required
								minlength="8"
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
						</div>
						<div>
							<label for="role" class="block text-sm font-medium text-gray-700 mb-1">
								ロール
							</label>
							<select
								id="role"
								name="role"
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
							>
								<option value="member">一般</option>
								<option value="admin">管理者</option>
							</select>
						</div>
					</div>
					<div class="flex justify-end">
						<button
							type="submit"
							class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
						>
							追加
						</button>
					</div>
				</form>
			</div>
		{/if}

		<!-- Member List -->
		<div class="bg-white shadow rounded-lg overflow-hidden">
			<table class="min-w-full divide-y divide-gray-200">
				<thead class="bg-gray-50">
					<tr>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
							名前
						</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
							メールアドレス
						</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
							ロール
						</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
							ステータス
						</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
							登録日
						</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
							操作
						</th>
					</tr>
				</thead>
				<tbody class="bg-white divide-y divide-gray-200">
					{#each data.members as member}
						<tr class={member.is_active ? '' : 'bg-gray-50'}>
							<td class="px-6 py-4 whitespace-nowrap">
								<span class="text-sm font-medium text-gray-900">{member.name}</span>
								{#if member.id === data.user.id}
									<span class="ml-2 text-xs text-blue-600">(自分)</span>
								{/if}
							</td>
							<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
								{member.email}
							</td>
							<td class="px-6 py-4 whitespace-nowrap">
								{#if member.id !== data.user.id}
									<form method="POST" action="?/updateRole" class="inline">
										<input type="hidden" name="userId" value={member.id} />
										<select
											name="role"
											class="text-sm border border-gray-300 rounded px-2 py-1"
											onchange={(e) => e.currentTarget.form?.submit()}
										>
											<option value="member" selected={member.role === 'member'}>一般</option>
											<option value="admin" selected={member.role === 'admin'}>管理者</option>
										</select>
									</form>
								{:else}
									<span class="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
										{roleLabels[member.role]}
									</span>
								{/if}
							</td>
							<td class="px-6 py-4 whitespace-nowrap">
								<span class="px-2 py-1 text-xs rounded-full {member.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'}">
									{member.is_active ? 'アクティブ' : '無効'}
								</span>
							</td>
							<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
								{formatDate(member.created_at)}
							</td>
							<td class="px-6 py-4 whitespace-nowrap text-sm">
								{#if member.id !== data.user.id}
									<form method="POST" action="?/toggle" class="inline">
										<input type="hidden" name="userId" value={member.id} />
										<button
											type="submit"
											class="text-blue-600 hover:text-blue-800"
										>
											{member.is_active ? '無効化' : '有効化'}
										</button>
									</form>
								{:else}
									<span class="text-gray-400">-</span>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</AppLayout>
