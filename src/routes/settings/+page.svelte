<script lang="ts">
	import AppLayout from '$lib/components/AppLayout.svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Tag management
	let showNewTagForm = $state(false);
	let newTagName = $state('');
	let newTagColor = $state('#3b82f6');
	let editingTagId = $state<string | null>(null);
	let editingTagName = $state('');
	let editingTagColor = $state('');

	const colorOptions = [
		{ value: '#ef4444', label: '赤' },
		{ value: '#f97316', label: 'オレンジ' },
		{ value: '#f59e0b', label: 'アンバー' },
		{ value: '#eab308', label: '黄' },
		{ value: '#84cc16', label: 'ライム' },
		{ value: '#22c55e', label: '緑' },
		{ value: '#10b981', label: 'エメラルド' },
		{ value: '#14b8a6', label: 'ティール' },
		{ value: '#06b6d4', label: 'シアン' },
		{ value: '#0ea5e9', label: 'スカイ' },
		{ value: '#3b82f6', label: '青' },
		{ value: '#6366f1', label: 'インディゴ' },
		{ value: '#8b5cf6', label: '紫' },
		{ value: '#a855f7', label: 'バイオレット' },
		{ value: '#d946ef', label: 'フクシア' },
		{ value: '#ec4899', label: 'ピンク' },
		{ value: '#f43f5e', label: 'ローズ' },
		{ value: '#78716c', label: 'グレー' }
	];

	function startEditTag(tag: { id: string; name: string; color: string }) {
		editingTagId = tag.id;
		editingTagName = tag.name;
		editingTagColor = tag.color;
	}

	function cancelEditTag() {
		editingTagId = null;
		editingTagName = '';
		editingTagColor = '';
	}
</script>

<AppLayout user={data.user}>
	<div class="px-4 sm:px-0">
		<h1 class="text-2xl font-bold text-gray-900 mb-6">設定</h1>

		<!-- Tag Management -->
		<div class="bg-white shadow rounded-lg mb-6">
			<div class="px-4 py-5 sm:px-6 border-b border-gray-200">
				<div class="flex items-center justify-between">
					<div>
						<h2 class="text-lg font-medium text-gray-900">タグ管理</h2>
						<p class="mt-1 text-sm text-gray-500">レビューに使用するタグを管理します</p>
					</div>
					<button
						type="button"
						onclick={() => showNewTagForm = !showNewTagForm}
						class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center gap-2"
					>
						<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
						</svg>
						新規タグ
					</button>
				</div>
			</div>

			<div class="p-6">
				{#if form?.error && (form?.action === 'createTag' || form?.action === 'updateTag' || form?.action === 'deleteTag')}
					<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
						{form.error}
					</div>
				{/if}

				{#if form?.success && (form?.action === 'createTag' || form?.action === 'updateTag' || form?.action === 'deleteTag')}
					<div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
						タグを{form.action === 'createTag' ? '作成' : form.action === 'updateTag' ? '更新' : '削除'}しました
					</div>
				{/if}

				<!-- New Tag Form -->
				{#if showNewTagForm}
					<form method="POST" action="?/createTag" class="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-6 mb-6 border border-slate-200">
						<h3 class="font-semibold text-slate-900 mb-4 flex items-center gap-2">
							<svg class="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
							</svg>
							新しいタグを作成
						</h3>
						<div class="space-y-4">
							<div>
								<label for="newTagName" class="block text-sm font-medium text-slate-700 mb-2">タグ名</label>
								<input
									type="text"
									id="newTagName"
									name="name"
									required
									bind:value={newTagName}
									placeholder="例: 重要, 確認中, デザイン..."
									class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
								/>
							</div>
							<div>
								<label class="block text-sm font-medium text-slate-700 mb-2">カラーを選択</label>
								<input type="hidden" name="color" value={newTagColor} />
								<div class="flex flex-wrap gap-2">
									{#each colorOptions as color}
										<button
											type="button"
											onclick={() => newTagColor = color.value}
											class="w-9 h-9 rounded-lg border-2 transition-all hover:scale-110 {newTagColor === color.value ? 'border-slate-900 scale-110 ring-2 ring-offset-2 ring-slate-400' : 'border-white shadow-sm'}"
											style="background-color: {color.value}"
											title={color.label}
										></button>
									{/each}
								</div>
							</div>
							<div class="pt-2">
								<label class="block text-sm font-medium text-slate-700 mb-2">プレビュー</label>
								<div class="flex items-center gap-3">
									<span
										class="px-4 py-2 text-sm font-semibold rounded-full shadow-sm"
										style="background-color: {newTagColor}20; color: {newTagColor}; border: 2px solid {newTagColor}"
									>
										{newTagName || 'タグ名'}
									</span>
									<span class="text-slate-400 text-sm">← このように表示されます</span>
								</div>
							</div>
						</div>
						<div class="flex gap-3 mt-6 pt-4 border-t border-slate-200">
							<button type="button" onclick={() => showNewTagForm = false} class="flex-1 px-4 py-2.5 text-slate-600 hover:bg-slate-200 rounded-xl font-medium">
								キャンセル
							</button>
							<button type="submit" class="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium">
								タグを作成
							</button>
						</div>
					</form>
				{/if}

				<!-- Tag List -->
				<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
					{#each data.tags as tag}
						{#if editingTagId === tag.id}
							<!-- Edit Mode -->
							<form method="POST" action="?/updateTag" class="col-span-full bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-5 border border-slate-200">
								<input type="hidden" name="tagId" value={tag.id} />
								<div class="space-y-4">
									<div>
										<label class="block text-sm font-medium text-slate-700 mb-2">タグ名</label>
										<input
											type="text"
											name="name"
											required
											bind:value={editingTagName}
											class="w-full px-4 py-2.5 border border-slate-200 rounded-xl"
										/>
									</div>
									<div>
										<label class="block text-sm font-medium text-slate-700 mb-2">カラー</label>
										<input type="hidden" name="color" value={editingTagColor} />
										<div class="flex flex-wrap gap-2">
											{#each colorOptions as color}
												<button
													type="button"
													onclick={() => editingTagColor = color.value}
													class="w-8 h-8 rounded-lg border-2 transition-all {editingTagColor === color.value ? 'border-slate-900 scale-110 ring-2 ring-offset-1 ring-slate-400' : 'border-white shadow-sm'}"
													style="background-color: {color.value}"
													title={color.label}
												></button>
											{/each}
										</div>
									</div>
									<div>
										<label class="block text-sm font-medium text-slate-700 mb-2">プレビュー</label>
										<span
											class="px-4 py-2 text-sm font-semibold rounded-full inline-block"
											style="background-color: {editingTagColor}20; color: {editingTagColor}; border: 2px solid {editingTagColor}"
										>
											{editingTagName}
										</span>
									</div>
								</div>
								<div class="flex gap-3 mt-4 pt-4 border-t border-slate-200">
									<button type="button" onclick={cancelEditTag} class="flex-1 px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-xl font-medium">
										キャンセル
									</button>
									<button type="submit" class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium">
										保存
									</button>
								</div>
							</form>
						{:else}
							<!-- Display Mode - Card Style -->
							<div class="group relative bg-white border-2 rounded-2xl p-4 hover:shadow-md transition-all" style="border-color: {tag.color}40">
								<div class="flex items-start justify-between">
									<div class="flex-1">
										<span
											class="px-4 py-2 text-sm font-bold rounded-full inline-block shadow-sm"
											style="background-color: {tag.color}; color: white"
										>
											{tag.name}
										</span>
										<div class="mt-3 flex items-center gap-2">
											<span class="w-4 h-4 rounded-full shadow-inner" style="background-color: {tag.color}"></span>
											<span class="text-xs text-slate-400 font-mono">{tag.color}</span>
										</div>
									</div>
									<div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
										<button
											type="button"
											onclick={() => startEditTag(tag)}
											class="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
											title="編集"
										>
											<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
											</svg>
										</button>
										<form method="POST" action="?/deleteTag" class="inline">
											<input type="hidden" name="tagId" value={tag.id} />
											<button
												type="submit"
												onclick={(e) => { if (!confirm('このタグを削除しますか？')) e.preventDefault(); }}
												class="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
												title="削除"
											>
												<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
												</svg>
											</button>
										</form>
									</div>
								</div>
							</div>
						{/if}
					{:else}
						<div class="col-span-full text-center py-12 text-slate-400">
							<svg class="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
							</svg>
							<p>タグがありません</p>
							<p class="text-sm mt-1">「新規タグ」ボタンからタグを作成してください</p>
						</div>
					{/each}
				</div>
			</div>
		</div>

		<!-- Email Settings -->
		<div class="bg-white shadow rounded-lg">
			<div class="px-4 py-5 sm:px-6 border-b border-gray-200">
				<h2 class="text-lg font-medium text-gray-900">メール通知設定</h2>
				<p class="mt-1 text-sm text-gray-500">Gmail SMTPを使用してメール通知を送信します</p>
			</div>
			<div class="p-6">
				{#if form?.error && form?.action === 'saveEmail'}
					<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
						{form.error}
					</div>
				{/if}

				{#if form?.success && form?.action === 'saveEmail'}
					<div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
						メール設定を保存しました
					</div>
				{/if}

				{#if form?.error && form?.action === 'testEmail'}
					<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
						{form.error}
					</div>
				{/if}

				{#if form?.success && form?.action === 'testEmail'}
					<div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
						{form.message}
					</div>
				{/if}

				<form method="POST" action="?/saveEmail" class="space-y-4">
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label for="smtpHost" class="block text-sm font-medium text-gray-700 mb-1">
								SMTPホスト
							</label>
							<input
								type="text"
								id="smtpHost"
								name="smtpHost"
								value={data.emailSettings?.smtp_host || 'smtp.gmail.com'}
								required
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
						</div>
						<div>
							<label for="smtpPort" class="block text-sm font-medium text-gray-700 mb-1">
								SMTPポート
							</label>
							<input
								type="number"
								id="smtpPort"
								name="smtpPort"
								value={data.emailSettings?.smtp_port || 587}
								required
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
						</div>
						<div>
							<label for="emailAddress" class="block text-sm font-medium text-gray-700 mb-1">
								メールアドレス
							</label>
							<input
								type="email"
								id="emailAddress"
								name="emailAddress"
								value={data.emailSettings?.email_address || ''}
								required
								placeholder="your-email@gmail.com"
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
						</div>
						<div>
							<label for="appPassword" class="block text-sm font-medium text-gray-700 mb-1">
								アプリパスワード
							</label>
							<input
								type="password"
								id="appPassword"
								name="appPassword"
								required
								placeholder="Googleアプリパスワード"
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
							<p class="mt-1 text-xs text-gray-500">
								Googleアカウントの「アプリパスワード」を使用してください
							</p>
						</div>
					</div>

					<div class="flex gap-4">
						<button
							type="submit"
							class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
						>
							保存
						</button>
					</div>
				</form>

				{#if data.emailSettings}
					<div class="mt-6 pt-6 border-t border-gray-200">
						<h3 class="text-sm font-medium text-gray-700 mb-2">テスト送信</h3>
						<p class="text-sm text-gray-500 mb-4">
							現在ログイン中のメールアドレス ({data.user.email}) にテストメールを送信します
						</p>
						<form method="POST" action="?/testEmail">
							<button
								type="submit"
								class="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
							>
								テストメール送信
							</button>
						</form>
					</div>
				{/if}
			</div>
		</div>

		<!-- Help Section -->
		<div class="mt-6 bg-blue-50 rounded-lg p-6">
			<h3 class="text-lg font-medium text-blue-900 mb-2">Gmail SMTPの設定方法</h3>
			<ol class="list-decimal list-inside text-sm text-blue-800 space-y-2">
				<li>Googleアカウントにログイン</li>
				<li>「セキュリティ」→「2段階認証プロセス」を有効化</li>
				<li>「アプリパスワード」を生成（「メール」「Windows コンピュータ」などを選択）</li>
				<li>生成された16文字のパスワードを上記フォームに入力</li>
			</ol>
			<p class="mt-4 text-sm text-blue-700">
				<strong>注意:</strong> 通常のGoogleパスワードではなく、アプリパスワードを使用してください
			</p>
		</div>
	</div>
</AppLayout>
