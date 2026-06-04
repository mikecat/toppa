"use strict";

window.addEventListener("DOMContentLoaded", () => {
	const elems = {};
	document.querySelectorAll("[id]").forEach((elem) => elems[elem.id] = elem);

	const editorIdToElement = {
		[-2]: { img: elems.setEditorCharacterB, input: elems.setEditorCharacterChooserB },
		[-1]: { img: elems.setEditorCharacterA, input: elems.setEditorCharacterChooserA },
		1: { img: elems.setEditorCharacter1, input: elems.setEditorCharacterChooser1 },
		2: { img: elems.setEditorCharacter2, input: elems.setEditorCharacterChooser2 },
		3: { img: elems.setEditorCharacter3, input: elems.setEditorCharacterChooser3 },
		4: { img: elems.setEditorCharacter4, input: elems.setEditorCharacterChooser4 },
		5: { img: elems.setEditorCharacter5, input: elems.setEditorCharacterChooser5 },
		6: { img: elems.setEditorCharacter6, input: elems.setEditorCharacterChooser6 },
	};

	const editorImageSet = {
		[-2]: null,
		[-1]: null,
		1: null,
		2: null,
		3: null,
		4: null,
		5: null,
		6: null,
	};

	// id: -2 ～ 6 (0 は除く) のいずれか
	const editorSetImage = async (id, imageBlobOrNull, resetInput = false) => {
		if (!(id in editorImageSet)) return;
		const elemsInfo = editorIdToElement[id];
		if (!elemsInfo) return;
		if (resetInput) elemsInfo.input.value = "";
		if (elemsInfo.img.src.startsWith("blob:")) {
			URL.revokeObjectURL(elemsInfo.img.src);
		}
		if (imageBlobOrNull === null) {
			editorImageSet[id] = null;
			elemsInfo.img.src = "empty.png";
		} else {
			await new Promise((resolve) => {
				const onsuccess = () => {
					elemsInfo.img.removeEventListener("load", onsuccess);
					elemsInfo.img.removeEventListener("error", onerror);
					editorImageSet[id] = imageBlobOrNull;
					resolve();
				};
				const onerror = () => {
					elemsInfo.img.removeEventListener("load", onsuccess);
					elemsInfo.img.removeEventListener("error", onerror);
					URL.revokeObjectURL(elemsInfo.img.src);
					editorImageSet[id] = null;
					elemsInfo.img.src = "empty.png";
					resolve();
				};
				elemsInfo.img.addEventListener("load", onsuccess);
				elemsInfo.img.addEventListener("error", onerror);
				const url = URL.createObjectURL(imageBlobOrNull);
				elemsInfo.img.src = url;
			});
		}
	};

	const imageSetListIdToName = new Map();

	const imageSetUrlCache = new Map();
	const renderImageSetPreview = async () => {
		const id = parseInt(elems.imgSetSelector.value, 10);
		if (isNaN(id)) {
			[
				elems.imgSet1, elems.imgSet2, elems.imgSet3,
				elems.imgSet4, elems.imgSet5, elems.imgSet6,
				elems.imgSetA, elems.imgSetB,
			].forEach((e) => e.src = "empty.png");
			return;
		}
		const imageSetUrls = await (async () => {
			const cachedUrls = imageSetUrlCache.get(id);
			if (cachedUrls) return cachedUrls;
			try {
				const imageSet = await loadImageSet(id);
				const urls = {};
				Object.entries(imageSet).forEach(([key, value]) => {
					urls[key] = URL.createObjectURL(value);
				});
				imageSetUrlCache.set(id, urls);
				return urls;
			} catch (error) {
				console.error(error);
				return {};
			};
		})();
		elems.imgSet1.src = imageSetUrls[1] ?? "empty.png";
		elems.imgSet2.src = imageSetUrls[2] ?? "empty.png";
		elems.imgSet3.src = imageSetUrls[3] ?? "empty.png";
		elems.imgSet4.src = imageSetUrls[4] ?? "empty.png";
		elems.imgSet5.src = imageSetUrls[5] ?? "empty.png";
		elems.imgSet6.src = imageSetUrls[6] ?? "empty.png";
		elems.imgSetA.src = imageSetUrls[-1] ?? "empty.png";
		elems.imgSetB.src = imageSetUrls[-2] ?? "empty.png";
	};

	const renderImageSetList = async (keyToSelect = null) => {
		const imageSetList = await (async () => {
			try {
				return await getImageSetList();
			} catch (error) {
				console.error(error);
				return null;
			}
		})();
		while (elems.imgSetSelector.firstChild) {
			elems.imgSetSelector.removeChild(elems.imgSetSelector.firstChild);
		}
		imageSetListIdToName.clear();
		if (!imageSetList || imageSetList.length === 0) {
			const option = document.createElement("option");
			option.setAttribute("value", "");
			option.appendChild(document.createTextNode(
				imageSetList ? "(画像セットがありません)" : "(画像セットの取得に失敗しました)"
			));
			elems.imgSetSelector.appendChild(option);
			elems.imgSetSelector.disabled = true;
			elems.imgSaveToFileButton.disabled = true;
			elems.imgCopyToEditorButton.disabled = true;
			elems.imgDeleteButton.disabled = true;
		} else {
			imageSetList.forEach(({ name, id }) => {
				const option = document.createElement("option");
				option.setAttribute("value", id);
				option.appendChild(document.createTextNode(name));
				elems.imgSetSelector.appendChild(option);
				imageSetListIdToName.set(id, name);
			});
			elems.imgSetSelector.disabled = false;
			elems.imgSaveToFileButton.disabled = false;
			elems.imgCopyToEditorButton.disabled = false;
			elems.imgDeleteButton.disabled = false;
		}
		if (keyToSelect !== null) elems.imgSetSelector.value = keyToSelect;
		await renderImageSetPreview();
	};

	const saveImageSetToFile = async (name, imageSet) => {
		const entries = Object.entries(imageSet);
		const images = {};
		for (let i = 0; i < entries.length; i++) {
			const [key, value] = entries[i];
			const bytes = await value.bytes();
			if (bytes.toBase64) {
				images[String(key)] = bytes.toBase64();
			} else {
				const bytesStr = Array.from(bytes, (e) => String.fromCharCode(e)).join("");
				images[String(key)] = btoa(bytesStr);
			}
		}
		const fileData = JSON.stringify({ name, images });
		const fileBlob = new Blob([fileData]);
		const fileUrl = URL.createObjectURL(fileBlob);
		const linkElement = document.createElement("a");
		linkElement.setAttribute("href", fileUrl);
		linkElement.setAttribute("download", name.replace(/\/\?<>\\:\*\|"/g, "") + ".toppaimgset"); // " <- sakura editor hack
		linkElement.click();
		URL.revokeObjectURL(fileUrl);
	};

	renderImageSetList();

	elems.imgSetSelector.addEventListener("change", () => {
		renderImageSetPreview();
	});

	elems.imgAddFromFileButton.addEventListener("click", () => {
		const fileSelector = document.createElement("input");
		fileSelector.setAttribute("type", "file");
		fileSelector.setAttribute("accept", ".toppaimgset");
		fileSelector.addEventListener("change", async () => {
			const file = fileSelector.files[0];
			if (!file) return;
			try {
				const fileData = JSON.parse(await file.text());
				const imgSetName = fileData.name;
				if (typeof imgSetName !== "string") throw new Error("invalid name");
				if (typeof fileData.images !== "object" || fileData.images === null) {
					throw new Error("invalid images");
				}
				const blobs = {};
				[-2, -1, 1, 2, 3, 4, 5, 6].forEach((key) => {
					const dataB64 = fileData.images[String(key)];
					if (typeof dataB64 !== "string") throw new Error(`invalid images[${key}]`);
					if (Uint8Array.fromBase64) {
						blobs[key] = new Blob([Uint8Array.fromBase64(dataB64)]);
					} else {
						const dataStr = atob(dataB64);
						const dataArray = Array.from(dataStr, (c) => c.charCodeAt(0));
						blobs[key] = new Blob([new Uint8Array(dataArray)]);
					}
				});
				try {
					const newKey = await saveImageSet(imgSetName, blobs);
					await renderImageSetList(newKey);
				} catch (dbError) {
					console.error(dbError);
					alert("データベースへの保存に失敗しました。");
				}
			} catch (error) {
				console.error(error);
				alert("ファイルの読み込みに失敗しました。");
			}
		});
		fileSelector.click();
	});

	elems.imgSaveToFileButton.addEventListener("click", async () => {
		const id = parseInt(elems.imgSetSelector.value, 10);
		if (isNaN(id)) return;
		const name = imageSetListIdToName.get(id);
		if (typeof name !== "string") return;
		try {
			const imageSet = await loadImageSet(id);
			await saveImageSetToFile(name, imageSet);
		} catch (error) {
			console.error(error);
			alert("データの取得に失敗しました。");
		}
	});

	elems.imgCopyToEditorButton.addEventListener("click", async () => {
		const id = parseInt(elems.imgSetSelector.value, 10);
		if (isNaN(id)) return;
		const name = imageSetListIdToName.get(id);
		if (typeof name !== "string") return;
		elems.setEditorName.value = name;
		try {
			const imageSet = await loadImageSet(id);
			const promises = [-2, -1, 1, 2, 3, 4, 5, 6].map(
				(id) => editorSetImage(id, imageSet[id] ?? null, true)
			);
			const results = await Promise.allSettled(promises);
			const rejects = results.filter((res) => res.status === "rejected");
			if (rejects.length > 0) console.error(rejects);
		} catch (error) {
			console.error(error);
			alert("データの取得に失敗しました。");
		}
	});

	elems.imgDeleteButton.addEventListener("click", () => {
		const id = parseInt(elems.imgSetSelector.value, 10);
		if (isNaN(id)) return;
		const name = imageSetListIdToName.get(id);
		if (typeof name !== "string") return;
		if (!confirm(`画像セット「${name}」を削除しますか？`)) return;
		deleteImageSet(id).then(() => {
			renderImageSetList();
		}, (error) => {
			console.error(error);
			alert("画像セットの削除に失敗しました。");
		});
	});

	elems.setEditorSaveLocalButton.addEventListener("click", async () => {
		if (Object.values(editorImageSet).some((e) => e === null)) {
			alert("全てのステップの画像を設定してください。");
			return;
		}
		try {
			const newId = await saveImageSet(elems.setEditorName.value, editorImageSet);
			await renderImageSetList(newId);
			// 保存されたことがわかりやすくするため、エディタをリセットする
			elems.setEditorName.value = "";
			const promises = [-2, -1, 1, 2, 3, 4, 5, 6].map((id) => editorSetImage(id, null, true));
			await Promise.all(promises);
		} catch (error) {
			console.error(error);
			alert("保存に失敗しました。");
		}
	});

	elems.setEditorSaveToFileButton.addEventListener("click", async () => {
		if (Object.values(editorImageSet).some((e) => e === null)) {
			alert("全てのステップの画像を設定してください。");
			return;
		}
		try {
			await saveImageSetToFile(elems.setEditorName.value, editorImageSet);
		} catch (error) {
			console.error(error);
			alert("保存に失敗しました。");
		}
	});

	Object.entries(editorIdToElement).forEach(([id, { img, input }]) => {
		input.addEventListener("change", async () => {
			const file = input.files[0];
			if (!file) return;
			try {
				const buf = await file.arrayBuffer();
				await editorSetImage(id, new Blob([buf]));
			} catch (error) {
				console.error(error);
				alert("ファイルの読み込みに失敗しました。");
			}
		});
	});
});
