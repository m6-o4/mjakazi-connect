"use client";

import { Container } from "@/components/container";
import { RichText } from "@/components/rich-text";
import { SubmitButton } from "@/components/submit-button";
import { fields } from "@/payload/blocks/forms/fields";
import { getClientSideURL } from "@/payload/utilities/get-url";
import {
	mapPayloadFieldsToRHFDefaults,
	rhfdefaultvalues,
} from "@/payload/utilities/map-form-fields";
import type { Form as FormType } from "@payloadcms/plugin-form-builder/types";
import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical";
import { LoaderCircle } from "lucide-react";
import { usePathname } from "next/navigation";
import { ComponentType, useCallback, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";

// describes a single form block managed through payload
type FormBlockType = {
	blockName?: string;
	blockType?: "formBlock";
	enableCompanionText?: boolean;
	form: FormType;
	companionText?: SerializedEditorState;
	confirmationMessage?: SerializedEditorState;
};

// combines the form block with an optional element id
type FormBlockProps = { id?: string } & FormBlockType;

// represents any component used for rendering dynamic field types
type FieldComponent = ComponentType<any>;

// renders a payload-managed form with dynamic fields and submission handling
const FormBlock = (props: FormBlockProps) => {
	const {
		enableCompanionText,
		form: formFromProps,
		form: { id: formID, confirmationMessage, confirmationType, submitButtonLabel } = {},
		companionText,
	} = props;

	// keep track of current route for contextual form submissions
	const pathname = usePathname();

	// set up react-hook-form and prefill default values based on payload field definitions
	const formMethods = useForm<rhfdefaultvalues>({
		defaultValues: mapPayloadFieldsToRHFDefaults(formFromProps.fields),
	});

	const {
		control,
		formState: { errors },
		handleSubmit,
		register,
	} = formMethods;

	// handle submission state and errors for user feedback
	const [isLoading, setIsLoading] = useState(false);
	const [hasSubmitted, setHasSubmitted] = useState<boolean>();
	const [error, setError] = useState<{ message: string; status?: string } | undefined>();

	// manages form submission flow including data formatting and api communication
	const onSubmit = useCallback(
		(data: rhfdefaultvalues) => {
			let loadingTimerID: ReturnType<typeof setTimeout>;

			const submitForm = async () => {
				setError(undefined);

				// wait briefly before showing loader to avoid flashing on quick responses
				loadingTimerID = setTimeout(() => setIsLoading(true), 1000);

				// transform flat key-value pairs into the structure expected by payload
				const dataToSend = Object.entries(data).map(([name, value]) => ({
					field: name,
					value,
				}));

				try {
					const req = await fetch(`${getClientSideURL()}/api/form-submissions`, {
						body: JSON.stringify({ form: formID, submissionData: dataToSend }),
						credentials: "include",
						headers: { "Content-Type": "application/json" },
						method: "POST",
					});

					const res = await req.json();
					clearTimeout(loadingTimerID);

					// surface backend errors to the user
					if (req.status >= 400) {
						setIsLoading(false);
						setError({
							message: res.errors?.[0]?.message || "internal server error.",
							status: req.status.toString(),
						});
						return;
					}

					// mark form as successfully submitted and show confirmation view
					setIsLoading(false);
					setHasSubmitted(true);
				} catch (e) {
					// handle unexpected network or client-side issues gracefully
					console.warn(e);
					setIsLoading(false);
					setError({ message: "something went wrong..." });
				}
			};

			void submitForm();
		},
		[formID, pathname],
	);

	return (
		<section className="section-spacing bg-bg-subtle">
			<Container>
				<div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
					<div className="space-y-8 lg:col-span-1">
						{/* display companion text beside form when enabled and before submission */}
						{enableCompanionText && companionText && !hasSubmitted && (
							<RichText
								className="mb-8 md:mb-12 md:text-start"
								data={companionText as unknown as any}
							/>
						)}
					</div>

					<div className="lg:col-span-2">
						<div className="border-border-subtle rounded-xl border-2 bg-white p-3 shadow-lg lg:p-5">
							{/* provide shared form context to all nested field components */}
							<FormProvider {...formMethods}>
								{/* show confirmation content if the form was successfully submitted */}
								{!isLoading && hasSubmitted && confirmationType === "message" && (
									<RichText className="text-left" data={confirmationMessage} />
								)}

								{/* temporary visual feedback during network request */}
								{isLoading && !hasSubmitted && (
									<p className="mb-4 flex items-center">
										<span>
											<LoaderCircle className="me-2 animate-spin" />
										</span>{" "}
										loading, please wait...
									</p>
								)}

								{/* display user-facing errors if submission fails */}
								{error && (
									<div className="text-red-400">{`${error.status || "error"}: ${error.message || ""}`}</div>
								)}

								{/* render dynamic fields when form is not yet submitted */}
								{!hasSubmitted && (
									<form id={formID} onSubmit={handleSubmit(onSubmit)}>
										<div className="mb-4 last:mb-0 sm:flex sm:flex-wrap sm:gap-4">
											{formFromProps?.fields?.map((field, index) => {
												// resolve and render field component based on payload configuration
												const Field: FieldComponent = (
													fields as Record<string, FieldComponent>
												)[field.blockType];
												if (!Field) return null;

												return (
													<Field
														key={index}
														form={formFromProps}
														{...field}
														{...formMethods}
														control={control}
														errors={errors}
														register={register}
													/>
												);
											})}
										</div>

										{/* display the form submission button */}
										<SubmitButton
											loading={isLoading}
											text={submitButtonLabel ?? "Submit"}
											form={formID}
										/>
									</form>
								)}
							</FormProvider>
						</div>
					</div>
				</div>
			</Container>
		</section>
	);
};

export { FormBlock };
