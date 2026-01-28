<script lang="ts">
	import AppLayout from '$lib/components/AppLayout.svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let showAddForm = $state(false);
	let expandedMember = $state<string | null>(null);

	// Edit modal state
	let showEditModal = $state(false);
	let editUserId = $state('');
	let editName = $state('');
	let editEmail = $state('');
	let editRole = $state('member');

	const roleLabels: Record<string, string> = {
		admin: '管理者',
		member: '一般'
	};

	const statusLabels: Record<string, string> = {
		pending: '確認待ち',
		approved: '確認OK',
		rejected: 'コメントあり'
	};

	const statusColors: Record<string, string> = {
		pending: 'bg-yellow-100 text-yellow-800',
		approved: 'bg-green-100 text-green-800',
		rejected: 'bg-red-100 text-red-800'
	};

	function formatDate(dateStr: string): string {
		const date = new Date(dateStr);
		return date.toLocaleDateString('ja-JP', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function openEditModal(member: { id: string; name: string; email: string; role: string }) {
		editUserId = member.id;
		editName = member.name;
		editEmail = member.email;
		editRole = member.role;
		showEditModal = true;
	}

	function closeEditModal() {
		showEditModal = false;
	}

	function toggleMemberExpand(memberId: string) {
		expandedMember = expandedMember === memberId ? null : memberId;
	}

	function getCreatedReviews(memberId: string) {
		return data.createdByMember[memberId] || [];
	}

	function getAssignedReviews(memberId: string) {
		return data.assignedToMember[memberId] || [];
	}

	function getCreatedCounts(memberId: string) {
		return data.createdCountsByMember[memberId] || { total: 0, pending: 0, approved: 0, rejected: 0 };
	}

	function getAssignedCounts(memberId: string) {
		return data.assignedCountsByMember[memberId] || { total: 0, pending: 0, approved: 0, rejected: 0 };
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

		<!-- Mobile Member Cards -->
		<div class="lg:hidden space-y-4">
			{#each data.members as member}
				<div class="bg-white shadow rounded-lg overflow-hidden {member.is_active ? '' : 'opacity-60'}">
					<!-- Member Header -->
					<div class="p-4 border-b border-slate-100">
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-3">
								<div class="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
									{member.name.charAt(0)}
								</div>
								<div>
									<div class="font-medium text-slate-900">
										{member.name}
										{#if member.id === data.user.id}
											<span class="ml-1 text-xs text-blue-600">(自分)</span>
										{/if}
									</div>
									<div class="text-xs text-slate-500">{member.email}</div>
								</div>
							</div>
							<div class="flex items-center gap-2">
								<span class="px-2 py-1 text-xs rounded-full {member.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'}">
									{member.is_active ? 'アクティブ' : '無効'}
								</span>
								<span class="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
									{roleLabels[member.role]}
								</span>
							</div>
						</div>
					</div>

					<!-- Check Counts -->
					<div class="p-4 grid grid-cols-2 gap-3">
						<button
							type="button"
							onclick={() => toggleMemberExpand(member.id)}
							class="flex items-center justify-between p-3 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
						>
							<div class="flex items-center gap-2">
								<span class="text-lg">📝</span>
								<span class="text-sm text-emerald-700">作成</span>
							</div>
							<div class="flex items-center gap-1">
								<span class="font-bold text-emerald-800">{getCreatedCounts(member.id).total}</span>
								{#if getCreatedCounts(member.id).pending > 0}
									<span class="px-1.5 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-700">{getCreatedCounts(member.id).pending}</span>
								{/if}
							</div>
						</button>
						<button
							type="button"
							onclick={() => toggleMemberExpand(member.id)}
							class="flex items-center justify-between p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
						>
							<div class="flex items-center gap-2">
								<span class="text-lg">📥</span>
								<span class="text-sm text-blue-700">依頼</span>
							</div>
							<div class="flex items-center gap-1">
								<span class="font-bold text-blue-800">{getAssignedCounts(member.id).total}</span>
								{#if getAssignedCounts(member.id).pending > 0}
									<span class="px-1.5 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">{getAssignedCounts(member.id).pending}</span>
								{/if}
							</div>
						</button>
					</div>

					<!-- Actions -->
					<div class="px-4 pb-4 flex flex-wrap gap-2">
						<button
							type="button"
							onclick={() => openEditModal(member)}
							class="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"
						>
							編集
						</button>
						{#if member.id !== data.user.id}
							<form method="POST" action="?/toggle" class="inline">
								<input type="hidden" name="userId" value={member.id} />
								<button
									type="submit"
									class="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
								>
									{member.is_active ? '無効化' : '有効化'}
								</button>
							</form>
							<form method="POST" action="?/delete" class="inline" onsubmit={(e) => { if (!confirm(`${member.name}を削除しますか？`)) e.preventDefault(); }}>
								<input type="hidden" name="userId" value={member.id} />
								<button
									type="submit"
									class="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
								>
									削除
								</button>
							</form>
						{/if}
					</div>

					<!-- Expanded Reviews (Mobile) -->
					{#if expandedMember === member.id}
						<div class="border-t border-slate-200">
							<!-- Created Reviews -->
							<div class="px-4 py-2 bg-emerald-50 border-b border-slate-200">
								<h5 class="text-sm font-semibold text-emerald-700">📝 作成したチェック ({getCreatedReviews(member.id).length}件)</h5>
							</div>
							{#if getCreatedReviews(member.id).length > 0}
								<div class="divide-y divide-slate-100">
									{#each getCreatedReviews(member.id) as review}
										<a href="/reviews/{review.id}" class="block px-4 py-3 hover:bg-slate-50">
											<div class="flex items-center justify-between">
												<span class="text-sm font-medium text-slate-900">{review.emoji || '📄'} {review.title}</span>
												<span class="px-2 py-0.5 text-xs rounded-full {statusColors[review.status as string] || 'bg-slate-100 text-slate-600'}">
													{statusLabels[review.status as string] || review.status}
												</span>
											</div>
											{#if review.goal_title}
												<div class="text-xs text-slate-500 mt-1">🎯 {review.goal_title}</div>
											{/if}
										</a>
									{/each}
								</div>
							{:else}
								<div class="px-4 py-4 text-center text-sm text-slate-400">作成したチェックはありません</div>
							{/if}

							<!-- Assigned Reviews -->
							<div class="px-4 py-2 bg-blue-50 border-b border-t border-slate-200">
								<h5 class="text-sm font-semibold text-blue-700">📥 依頼されたチェック ({getAssignedReviews(member.id).length}件)</h5>
							</div>
							{#if getAssignedReviews(member.id).length > 0}
								<div class="divide-y divide-slate-100">
									{#each getAssignedReviews(member.id) as review}
										<a href="/reviews/{review.id}" class="block px-4 py-3 hover:bg-slate-50">
											<div class="flex items-center justify-between">
												<span class="text-sm font-medium text-slate-900">{review.emoji || '📄'} {review.title}</span>
												<span class="px-2 py-0.5 text-xs rounded-full {statusColors[review.status as string] || 'bg-slate-100 text-slate-600'}">
													{statusLabels[review.status as string] || review.status}
												</span>
											</div>
											<div class="text-xs text-slate-500 mt-1">依頼者: {review.requester_name}</div>
										</a>
									{/each}
								</div>
							{:else}
								<div class="px-4 py-4 text-center text-sm text-slate-400">依頼されたチェックはありません</div>
							{/if}
						</div>
					{/if}
				</div>
			{/each}
		</div>

		<!-- Desktop Member Table -->
		<div class="hidden lg:block bg-white shadow rounded-lg overflow-hidden">
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
							作成したチェック
						</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
							依頼されたチェック
						</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
							ロール
						</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
							ステータス
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
								<button
									type="button"
									onclick={() => toggleMemberExpand(member.id)}
									class="flex items-center gap-2 text-sm hover:bg-slate-100 px-2 py-1 rounded transition-colors"
								>
									<svg class="w-4 h-4 text-slate-400 transition-transform {expandedMember === member.id ? 'rotate-90' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
									</svg>
									<span class="font-medium">{getCreatedCounts(member.id).total}</span>
									<span class="text-slate-400">件</span>
									{#if getCreatedCounts(member.id).pending > 0}
										<span class="px-1.5 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-700">{getCreatedCounts(member.id).pending}</span>
									{/if}
								</button>
							</td>
							<td class="px-6 py-4 whitespace-nowrap">
								<button
									type="button"
									onclick={() => toggleMemberExpand(member.id)}
									class="flex items-center gap-2 text-sm hover:bg-slate-100 px-2 py-1 rounded transition-colors"
								>
									<svg class="w-4 h-4 text-slate-400 transition-transform {expandedMember === member.id ? 'rotate-90' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
									</svg>
									<span class="font-medium">{getAssignedCounts(member.id).total}</span>
									<span class="text-slate-400">件</span>
									{#if getAssignedCounts(member.id).pending > 0}
										<span class="px-1.5 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">{getAssignedCounts(member.id).pending}</span>
									{/if}
								</button>
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
							<td class="px-6 py-4 whitespace-nowrap text-sm">
								<div class="flex gap-3">
									<button
										type="button"
										onclick={() => openEditModal(member)}
										class="text-blue-600 hover:text-blue-800"
									>
										編集
									</button>
									{#if member.id !== data.user.id}
										<form method="POST" action="?/toggle" class="inline">
											<input type="hidden" name="userId" value={member.id} />
											<button
												type="submit"
												class="text-slate-600 hover:text-slate-800"
											>
												{member.is_active ? '無効化' : '有効化'}
											</button>
										</form>
										<form method="POST" action="?/delete" class="inline" onsubmit={(e) => { if (!confirm(`${member.name}を削除しますか？`)) e.preventDefault(); }}>
											<input type="hidden" name="userId" value={member.id} />
											<button
												type="submit"
												class="text-red-600 hover:text-red-800"
											>
												削除
											</button>
										</form>
									{/if}
								</div>
							</td>
						</tr>
						<!-- Expanded member reviews -->
						{#if expandedMember === member.id}
							<tr>
								<td colspan="7" class="px-0 py-0">
									<div class="bg-slate-50 border-t border-b border-slate-200">
										<!-- Created Reviews Section -->
										<div class="px-6 py-3 border-b border-slate-200 bg-emerald-50">
											<h4 class="text-sm font-semibold text-emerald-700">📝 {member.name}が作成したチェック ({getCreatedReviews(member.id).length}件)</h4>
										</div>
										{#if getCreatedReviews(member.id).length > 0}
											<table class="min-w-full">
												<thead class="bg-slate-100">
													<tr>
														<th class="px-6 py-2 text-left text-xs font-medium text-slate-500 uppercase">タイトル</th>
														<th class="px-6 py-2 text-left text-xs font-medium text-slate-500 uppercase">プロジェクト</th>
														<th class="px-6 py-2 text-left text-xs font-medium text-slate-500 uppercase">ステータス</th>
														<th class="px-6 py-2 text-left text-xs font-medium text-slate-500 uppercase">作成日</th>
														<th class="px-6 py-2 text-left text-xs font-medium text-slate-500 uppercase">操作</th>
													</tr>
												</thead>
												<tbody class="divide-y divide-slate-200 bg-white">
													{#each getCreatedReviews(member.id) as review}
														<tr class="hover:bg-slate-50">
															<td class="px-6 py-3">
																<a href="/reviews/{review.id}" class="text-blue-600 hover:underline text-sm font-medium">
																	{review.emoji || '📄'} {review.title}
																</a>
															</td>
															<td class="px-6 py-3 text-sm text-slate-500">
																{#if review.goal_id}
																	<a href="/goals/{review.goal_id}" class="text-blue-600 hover:underline">
																		{review.goal_title}
																	</a>
																{:else}
																	<span class="text-slate-400">-</span>
																{/if}
															</td>
															<td class="px-6 py-3">
																<span class="px-2 py-1 text-xs rounded-full {statusColors[review.status as string] || 'bg-slate-100 text-slate-600'}">
																	{statusLabels[review.status as string] || review.status}
																</span>
															</td>
															<td class="px-6 py-3 text-sm text-slate-500">
																{formatDate(review.created_at as string)}
															</td>
															<td class="px-6 py-3">
																<a
																	href="/reviews/{review.id}"
																	class="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors bg-orange-50 text-orange-600 hover:bg-orange-100"
																>
																	<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
																		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
																		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
																	</svg>
																	開く
																</a>
															</td>
														</tr>
													{/each}
												</tbody>
											</table>
										{:else}
											<div class="px-6 py-4 text-center text-slate-500 text-sm bg-white">
												作成したチェックはありません
											</div>
										{/if}

										<!-- Assigned Reviews Section -->
										<div class="px-6 py-3 border-b border-t border-slate-200 bg-blue-50">
											<h4 class="text-sm font-semibold text-blue-700">📥 {member.name}に依頼されたチェック ({getAssignedReviews(member.id).length}件)</h4>
										</div>
										{#if getAssignedReviews(member.id).length > 0}
											<table class="min-w-full">
												<thead class="bg-slate-100">
													<tr>
														<th class="px-6 py-2 text-left text-xs font-medium text-slate-500 uppercase">タイトル</th>
														<th class="px-6 py-2 text-left text-xs font-medium text-slate-500 uppercase">依頼者</th>
														<th class="px-6 py-2 text-left text-xs font-medium text-slate-500 uppercase">プロジェクト</th>
														<th class="px-6 py-2 text-left text-xs font-medium text-slate-500 uppercase">ステータス</th>
														<th class="px-6 py-2 text-left text-xs font-medium text-slate-500 uppercase">操作</th>
													</tr>
												</thead>
												<tbody class="divide-y divide-slate-200 bg-white">
													{#each getAssignedReviews(member.id) as review}
														<tr class="hover:bg-slate-50">
															<td class="px-6 py-3">
																<a href="/reviews/{review.id}" class="text-blue-600 hover:underline text-sm font-medium">
																	{review.emoji || '📄'} {review.title}
																</a>
															</td>
															<td class="px-6 py-3 text-sm text-slate-500">
																{review.requester_name}
															</td>
															<td class="px-6 py-3 text-sm text-slate-500">
																{#if review.goal_id}
																	<a href="/goals/{review.goal_id}" class="text-blue-600 hover:underline">
																		{review.goal_title}
																	</a>
																{:else}
																	<span class="text-slate-400">-</span>
																{/if}
															</td>
															<td class="px-6 py-3">
																<span class="px-2 py-1 text-xs rounded-full {statusColors[review.status as string] || 'bg-slate-100 text-slate-600'}">
																	{statusLabels[review.status as string] || review.status}
																</span>
															</td>
															<td class="px-6 py-3">
																<a
																	href="/reviews/{review.id}"
																	class="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors bg-orange-50 text-orange-600 hover:bg-orange-100"
																>
																	<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
																		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
																		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
																	</svg>
																	開く
																</a>
															</td>
														</tr>
													{/each}
												</tbody>
											</table>
										{:else}
											<div class="px-6 py-4 text-center text-slate-500 text-sm bg-white">
												依頼されたチェックはありません
											</div>
										{/if}
									</div>
								</td>
							</tr>
						{/if}
					{/each}
				</tbody>
			</table>
		</div>
	</div>

	<!-- Edit Modal -->
	{#if showEditModal}
		<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onclick={closeEditModal}>
			<div class="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4" onclick={(e) => e.stopPropagation()}>
				<div class="px-6 py-4 border-b border-slate-200">
					<h3 class="text-lg font-semibold text-slate-900">メンバー編集</h3>
				</div>

				<form method="POST" action="?/edit">
					<input type="hidden" name="userId" value={editUserId} />

					<div class="px-6 py-4 space-y-4">
						<div>
							<label for="editName" class="block text-sm font-medium text-slate-700 mb-1">名前</label>
							<input
								type="text"
								id="editName"
								name="name"
								bind:value={editName}
								required
								class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
						</div>

						<div>
							<label for="editEmail" class="block text-sm font-medium text-slate-700 mb-1">メールアドレス</label>
							<input
								type="email"
								id="editEmail"
								name="email"
								bind:value={editEmail}
								required
								class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
						</div>

						<div>
							<label for="editRole" class="block text-sm font-medium text-slate-700 mb-1">ロール</label>
							<select
								id="editRole"
								name="role"
								bind:value={editRole}
								class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
							>
								<option value="member">一般</option>
								<option value="admin">管理者</option>
							</select>
						</div>
					</div>

					<div class="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
						<button
							type="button"
							onclick={closeEditModal}
							class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
						>
							キャンセル
						</button>
						<button
							type="submit"
							class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
						>
							保存
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}
</AppLayout>
