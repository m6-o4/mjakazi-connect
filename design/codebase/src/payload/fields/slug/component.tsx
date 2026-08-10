"use client";

import { formatSlug } from "@/payload/fields/slug/format-slug";
import {
	Button,
	FieldLabel,
	TextInput,
	useField,
	useForm,
	useFormFields,
} from "@payloadcms/ui";
import { TextFieldClientProps } from "payload";
import { MouseEvent, useCallback } from "react";

import "@/payload/fields/slug/index.scss";

type MouseEventType = MouseEvent<Element>;

type SlugComponentProps = {
	fieldToUse: string;
	checkboxFieldPath: string;
} & TextFieldClientProps;

const SlugComponent = ({
	field,
	fieldToUse,
	checkboxFieldPath: checkboxFieldPathFromProps,
	path,
	readOnly: readOnlyFromProps,
}: SlugComponentProps) => {
	const { label } = field;

	const checkboxFieldPath = path?.includes(".")
		? `${path}.${checkboxFieldPathFromProps}`
		: checkboxFieldPathFromProps;

	const { value, setValue } = useField<string>({ path: path || field.name });

	const { dispatchFields, getDataByPath } = useForm();

	const isLocked = useFormFields(([fields]) => {
		return fields[checkboxFieldPath]?.value as boolean;
	});

	const handleGenerate = useCallback(
		(e: MouseEventType) => {
			e.preventDefault();

			const targetFieldValue = getDataByPath(fieldToUse) as string;

			if (targetFieldValue) {
				const formattedSlug = formatSlug(targetFieldValue);
				if (value !== formattedSlug) setValue(formattedSlug);
			} else {
				if (value !== "") setValue("");
			}
		},
		[setValue, value, fieldToUse, getDataByPath],
	);

	const handleLock = useCallback(
		(e: MouseEventType) => {
			e.preventDefault();

			dispatchFields({
				type: "UPDATE",
				path: checkboxFieldPath,
				value: !isLocked,
			});
		},
		[isLocked, checkboxFieldPath, dispatchFields],
	);

	return (
		<div className="field-type slug-field-component">
			<div className="label-wrapper">
				<FieldLabel htmlFor={`field-${path}`} label={label} />
				{!isLocked && (
					<Button className="lock-button" buttonStyle="none" onClick={handleGenerate}>
						Generate
					</Button>
				)}
				<Button className="lock-button" buttonStyle="none" onClick={handleLock}>
					{isLocked ? "Unlock" : "Lock"}
				</Button>
			</div>
			<TextInput
				value={value}
				onChange={setValue}
				path={path || field.name}
				readOnly={Boolean(readOnlyFromProps || isLocked)}
			/>
		</div>
	);
};

export { SlugComponent };
