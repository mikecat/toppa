"use strict";

// IDBDatabase を返す
const getDbInstance = (() => {
	let dbInstance = null;
	return async () => {
		if (dbInstance) return dbInstance;
		const db = await new Promise((resolve) => {
			try {
				const dbOpenReq = window.indexedDB.open("imgdb", 1);
				dbOpenReq.onerror = () => {
					console.error(dbOpenReq.error);
					resolve(null);
				};
				dbOpenReq.onsuccess = () => resolve(dbOpenReq.result);
				dbOpenReq.onupgradeneeded = (event) => {
					const oldVersion = event.oldVersion;
					const db = event.target.result;
					if (oldVersion === 0) {
						db.createObjectStore("nameList", {
							keyPath: "id",
							autoIncrement: true,
						});
						db.createObjectStore("images");
					}
				};
			} catch (error) {
				console.error(error);
				resolve(null);
			}
		});
		if (db) {
			db.onclose = () => {
				console.warn("database closed");
				dbInstance = null;
			};
			dbInstance = db;
			return db;
		}
		return null;
	};
})();

// { id: 画像ID (数値), name: 画像名 (文字列) } 形式のオブジェクトの配列を返す
async function getImageSetList() {
	const db = await getDbInstance();
	if (!db) throw new Error("database connection failed");
	const tr = db.transaction("nameList", "readonly");
	const nameListStore = tr.objectStore("nameList");
	return new Promise((resolve, reject) => {
		const req = nameListStore.getAll();
		req.onerror = () => reject(req.error);
		req.onsuccess = () => resolve(req.result);
	});
}

// 画像ID を指定し、各キャラクターの画像 (Blob) が格納されたオブジェクトを返す
// (キー -2 ～ 6 を使用、0 は含まれない)
async function loadImageSet(id) {
	const db = await getDbInstance();
	if (!db) throw new Error("database connection failed");
	const tr = db.transaction("images", "readonly");
	const imagesStore = tr.objectStore("images");
	return new Promise((resolve, reject) => {
		const req = imagesStore.get(id);
		req.onerror = () => reject(req.error);
		req.onsuccess = () => resolve(req.result ?? null);
	});
}

// 画像セットをデータベースに保存する
// name に画像セット名 (文字列)、
// images に各キャラクターの画像 (Blob) が格納されたオブジェクトを指定する
// 保存された画像セットのIDを返す
async function saveImageSet(name, images) {
	const db = await getDbInstance();
	if (!db) throw new Error("database connection failed");
	const tr = db.transaction(["nameList", "images"], "readwrite");
	const nameListStore = tr.objectStore("nameList");
	const imagesStore = tr.objectStore("images");
	return new Promise((resolve, reject) => {
		let newKey = null;
		tr.oncomplete = () => {
			if (newKey === null) trReject(new Error("no new key found"));
			resolve(newKey);
		};
		tr.onerror = () => reject(tr.error);
		const nameAddReq = nameListStore.add({ name });
		nameAddReq.onsuccess = () => {
			newKey = nameAddReq.result;
			imagesStore.add(images, newKey);
		};
	});
}

// IDを指定し、その画像セットを削除する
async function deleteImageSet(id) {
	const db = await getDbInstance();
	if (!db) throw new Error("database connection failed");
	const tr = db.transaction(["nameList", "images"], "readwrite");
	const nameListStore = tr.objectStore("nameList");
	const imagesStore = tr.objectStore("images");
	return new Promise((resolve, reject) => {
		tr.oncomplete = () => resolve();
		tr.onerror = () => reject(tr.error);
		const nameDeleteReq = nameListStore.delete(id);
		nameDeleteReq.onsuccess = () => {
			imagesStore.delete(id);
		};
	});
}
