import React, { useCallback } from "react";
import { useForm } from "react-hook-form";
import { Button, Input, RTE, Select } from "..";
import appwriteService from "../../appwrite/config";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

export default function PostForm({ post }) {
    const { register, handleSubmit, watch, setValue, control, getValues } = useForm({
        defaultValues: {
            title: post?.title || "",
            slug: post?.$id || "",
            content: post?.content || "",
            status: post?.status || "active",
        },
    });

    const navigate = useNavigate();
    const userData = useSelector((state) => state.auth.userData);
    const [aiTopic, setAiTopic] = React.useState("");
    const [isGenerating, setIsGenerating] = React.useState(false);
    const [aiError, setAiError] = React.useState("");

    const generateDraft = async () => {
        setIsGenerating(true);
        setAiError("");

        try {
            const draft = await appwriteService.generateDraft(aiTopic.trim());
            const safeContent = draft.content
                .split(/\n\s*\n/)
                .map((paragraph) => `<p>${paragraph
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/\n/g, "<br>")}</p>`)
                .join("");

            setValue("title", draft.title, { shouldDirty: true, shouldValidate: true });
            setValue("slug", slugTransform(draft.title), { shouldDirty: true, shouldValidate: true });
            setValue("content", safeContent, { shouldDirty: true, shouldValidate: true });
        } catch (error) {
            setAiError(error.message || "Unable to generate a draft. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    const submit = async (data) => {
        if (post) {
            const file = data.image[0] ? await appwriteService.uploadFile(data.image[0]) : null;

            if (file) {
                appwriteService.deleteFile(post.featuredImage);
            }

            const dbPost = await appwriteService.updatePost(post.$id, {
                ...data,
                featuredImage: file ? file.$id : undefined,
            });

            if (dbPost) {
                navigate(`/post/${dbPost.$id}`);
            }
        } else {
            const file = await appwriteService.uploadFile(data.image[0]);

            if (file) {
                const fileId = file.$id;
                data.featuredImage = fileId;
                const dbPost = await appwriteService.createPost({ ...data, userId: userData.$id });

                if (dbPost) {
                    navigate(`/post/${dbPost.$id}`);
                }
            }
        }
    };

    const slugTransform = useCallback((value) => {
        if (value && typeof value === "string")
            return value
                .trim()
                .toLowerCase()
                .replace(/[^a-zA-Z\d\s]+/g, "-")
                .replace(/\s/g, "-");

        return "";
    }, []);

    React.useEffect(() => {
        const subscription = watch((value, { name }) => {
            if (name === "title") {
                setValue("slug", slugTransform(value.title), { shouldValidate: true });
            }
        });

        return () => subscription.unsubscribe();
    }, [watch, slugTransform, setValue]);

    return (
        <form onSubmit={handleSubmit(submit)} className="flex flex-wrap">
            <div className="w-2/3 px-2">
                <section className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4 text-left">
                    <label className="mb-2 block font-medium text-gray-900" htmlFor="ai-topic">
                        AI draft starter
                    </label>
                    <textarea
                        id="ai-topic"
                        value={aiTopic}
                        onChange={(event) => setAiTopic(event.target.value)}
                        maxLength={500}
                        rows={3}
                        placeholder="What should your blog post be about?"
                        className="mb-3 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:border-blue-500"
                    />
                    <Button
                        type="button"
                        onClick={generateDraft}
                        disabled={!aiTopic.trim() || isGenerating}
                        className="disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isGenerating ? "Generating..." : "Generate title and draft"}
                    </Button>
                    {aiError && <p role="alert" className="mt-3 text-sm text-red-600">{aiError}</p>}
                </section>
                <Input
                    label="Title :"
                    placeholder="Title"
                    className="mb-4"
                    {...register("title", { required: true })}
                />
                <Input
                    label="Slug :"
                    placeholder="Slug"
                    className="mb-4"
                    {...register("slug", { required: true })}
                    onInput={(e) => {
                        setValue("slug", slugTransform(e.currentTarget.value), { shouldValidate: true });
                    }}
                />
                <RTE label="Content :" name="content" control={control} defaultValue={getValues("content")} />
            </div>
            <div className="w-1/3 px-2">
                <Input
                    label="Featured Image :"
                    type="file"
                    className="mb-4"
                    accept="image/png, image/jpg, image/jpeg, image/gif"
                    {...register("image", { required: !post })}
                />
                {post && (
                    <div className="w-full mb-4">
                        <img
                            src={appwriteService.getFilePreview(post.featuredImage)}
                            alt={post.title}
                            className="rounded-lg"
                        />
                    </div>
                )}
                <Select
                    options={["active", "inactive"]}
                    label="Status"
                    className="mb-4"
                    {...register("status", { required: true })}
                />
                <Button type="submit" bgColor={post ? "bg-green-500" : undefined} className="w-full">
                    {post ? "Update" : "Submit"}
                </Button>
            </div>
        </form>
    );
}