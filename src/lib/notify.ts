"use client";

import type { ReactNode } from "react";

import { toast } from "@/components/ui/toast";

type NotifyOptions = {
	id?: string;
	description?: ReactNode;
};

// app-wide toast helpers. one place for the behaviour so every confirmation is
// consistent: success and info auto-dismiss; errors stay until the user closes
// them. pass a stable `id` for repeatable actions so toasts update in place
// rather than stacking on repeated clicks
const notifySuccess = (title: string, options: NotifyOptions = {}): string =>
	toast.add({
		id: options.id,
		type: "success",
		title,
		description: options.description,
		timeout: 5000,
	});

const notifyInfo = (title: string, options: NotifyOptions = {}): string =>
	toast.add({
		id: options.id,
		type: "info",
		title,
		description: options.description,
		timeout: 8000,
	});

const notifyError = (title: string, options: NotifyOptions = {}): string =>
	toast.add({
		id: options.id,
		type: "error",
		title,
		description: options.description,
		priority: "high",
		timeout: 0,
	});

export { notifyError, notifyInfo, notifySuccess };
