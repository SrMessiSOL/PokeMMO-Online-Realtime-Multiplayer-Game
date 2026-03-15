const API_BASE_URL = `${window.location.protocol}//${window.location.hostname}:3000/api`;

export async function getWalletProfile(address) {
    const response = await fetch(`${API_BASE_URL}/wallets/${encodeURIComponent(address)}`);
    if (!response.ok) {
        throw new Error("Unable to load wallet profile.");
    }

    return response.json();
}

export async function saveWalletCharacter(address, payload) {
    const response = await fetch(`${API_BASE_URL}/wallets/${encodeURIComponent(address)}/character`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(errorPayload.error || "Unable to save character.");
    }

    return response.json();
}
