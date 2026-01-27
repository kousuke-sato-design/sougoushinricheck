<script lang="ts">
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<div class="min-h-screen bg-gray-100 flex items-center justify-center">
	<div class="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
		<h1 class="text-2xl font-bold text-center text-gray-800 mb-2">
			初期セットアップ
		</h1>
		<p class="text-gray-600 text-center mb-8">
			管理者アカウントを作成してください
		</p>

		{#if form?.error}
			<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
				{form.error}
			</div>
		{/if}

		<form method="POST" action="?/setup" class="space-y-4">
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
				<label for="confirmPassword" class="block text-sm font-medium text-gray-700 mb-1">
					パスワード（確認）
				</label>
				<input
					type="password"
					id="confirmPassword"
					name="confirmPassword"
					required
					minlength="8"
					class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
				/>
			</div>

			<button
				type="submit"
				class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
			>
				セットアップを完了
			</button>
		</form>
	</div>
</div>
