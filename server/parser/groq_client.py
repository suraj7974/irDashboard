"""
Groq client with multiple model fallbacks and large context window support
"""

import os
from groq import Groq
from dotenv import load_dotenv
import time

load_dotenv()


class GroqClient:
    def __init__(self):
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            print("⚠️  Warning: GROQ_API_KEY not found in environment variables")
            print("   Please set your Groq API key in the .env file")
            self.client = None
        else:
            self.client = Groq(api_key=api_key)

        # Models ordered by context window size (largest first)
        # Using models with large context windows as requested
        self.models = [
            {
                "name": "llama-3.1-8b-instant",
                "context_window": 131072,  # 128k tokens
                "max_tokens": 8192,
                "description": "Best reasoning, largest model",
            },
            {
                "name": "llama-3.3-70b-versatile",
                "context_window": 131072,  # 128k tokens
                "max_tokens": 8192,
                "description": "Latest model with enhanced capabilities",
            },
            {
                "name": "deepseek-r1-distill-llama-70b",
                "context_window": 131072,  # 128k tokens
                "max_tokens": 8192,
                "description": "Fastest processing, same context window",
            },
            {
                "name": "meta-llama/llama-4-maverick-17b-128e-instruct",
                "context_window": 65536,  # 64k tokens
                "max_tokens": 8192,
                "description": "Good balance of speed and capability",
            },
        ]

        self.current_model_index = 0

    def get_current_model(self):
        """Get the currently selected model"""
        return self.models[self.current_model_index]

    def switch_to_next_model(self):
        """Switch to the next available model"""
        self.current_model_index = (self.current_model_index + 1) % len(self.models)
        current = self.get_current_model()
        print(f"🔄 Switching to model: {current['name']}")
        print(f"   📏 Context window: {current['context_window']:,} tokens")
        print(f"   📝 Description: {current['description']}")

    def print_model_info(self):
        """Print information about all available models"""
        print("\n🤖 Available Groq Models:")
        print("=" * 60)
        for i, model in enumerate(self.models):
            status = "🟢 CURRENT" if i == self.current_model_index else "⚪ Available"
            print(f"{status} {model['name']}")
            print(f"       Context: {model['context_window']:,} tokens")
            print(f"       Max out: {model['max_tokens']:,} tokens")
            print(f"       Info: {model['description']}")
            print()

    def chat_completion(
        self, messages, temperature=0.2, max_tokens=None, max_retries=3
    ):
        """
        Create chat completion with automatic model fallback
        """
        if not self.client:
            raise Exception(
                "Groq client not initialized. Please check your GROQ_API_KEY."
            )

        for attempt in range(max_retries):
            current_model = self.get_current_model()

            try:
                # Use model's max_tokens if not specified
                if max_tokens is None:
                    max_tokens = current_model["max_tokens"]

                response = self.client.chat.completions.create(
                    model=current_model["name"],
                    messages=messages,
                    temperature=temperature,
                    max_tokens=min(max_tokens, current_model["max_tokens"]),
                )

                print(f"✅ Success with model: {current_model['name']}")
                return response

            except Exception as e:
                print(f"❌ Error with model {current_model['name']}: {str(e)}")

                # Check if it's a quota/rate limit error
                if (
                    "quota" in str(e).lower()
                    or "rate" in str(e).lower()
                    or "limit" in str(e).lower()
                ):
                    print(f"🚫 Quota/Rate limit reached for {current_model['name']}")
                    self.switch_to_next_model()
                    continue

                # Check if it's a context window error
                elif "context" in str(e).lower() or "token" in str(e).lower():
                    print(f"📏 Context window exceeded for {current_model['name']}")
                    self.switch_to_next_model()
                    continue

                # For other errors, wait and retry with same model
                else:
                    if attempt < max_retries - 1:
                        print(
                            f"⏳ Retrying in 2 seconds... (attempt {attempt + 1}/{max_retries})"
                        )
                        time.sleep(2)
                        continue
                    else:
                        # Last attempt failed, try next model
                        self.switch_to_next_model()

        # If all models fail, raise the last exception
        raise Exception(f"All models failed after {max_retries} attempts")

    def count_tokens_estimate(self, text):
        """
        Rough token estimation (1 token ≈ 4 characters for most models)
        """
        return len(text) // 4

    def get_max_context_window(self):
        """Get the context window of the current model"""
        return self.get_current_model()["context_window"]

    def get_optimal_chunk_size(self, safety_margin=0.7):
        """
        Get optimal chunk size for current model with safety margin

        Args:
            safety_margin: Percentage of context window to use (0.7 = 70%)
        """
        current_model = self.get_current_model()
        context_window = current_model["context_window"]

        # Use 70% of context window by default to leave room for:
        # - System prompts
        # - Response generation
        # - Safety buffer
        optimal_size = int(context_window * safety_margin)

        print(f"📏 Model: {current_model['name']}")
        print(f"   Context window: {context_window:,} tokens")
        print(
            f"   Optimal chunk size: {optimal_size:,} tokens ({safety_margin*100:.0f}% of context)"
        )

        return optimal_size

    def split_text_adaptive(self, text, safety_margin=0.7):
        """
        Split text into chunks based on current model's context window
        """
        chunk_size = self.get_optimal_chunk_size(safety_margin)

        # Convert to character estimate (1 token ≈ 4 chars)
        max_chars = chunk_size * 4

        chunks = []
        lines = text.split("\n")
        current_chunk = []
        current_chars = 0

        for line in lines:
            line_chars = len(line) + 1  # +1 for newline

            # If adding this line would exceed the limit and we have content
            if current_chars + line_chars > max_chars and current_chunk:
                chunks.append("\n".join(current_chunk))
                current_chunk = [line]
                current_chars = line_chars
            else:
                current_chunk.append(line)
                current_chars += line_chars

        # Add the last chunk if it has content
        if current_chunk:
            chunks.append("\n".join(current_chunk))

        print(
            f"📝 Split text into {len(chunks)} adaptive chunks (max {chunk_size:,} tokens each)"
        )

        # Verify chunk sizes and warn if any exceed the limit
        for i, chunk in enumerate(chunks):
            chunk_tokens = self.count_tokens_estimate(chunk)
            if chunk_tokens > chunk_size:
                print(
                    f"⚠️  Chunk {i+1} has {chunk_tokens:,} tokens (exceeds {chunk_size:,} limit)"
                )

        return chunks
