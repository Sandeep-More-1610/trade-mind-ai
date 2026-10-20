FROM python:3.11-slim
WORKDIR /app
ENV PYTHONUNBUFFERED=1 TF_CPP_MIN_LOG_LEVEL=3 CUDA_VISIBLE_DEVICES=-1
COPY requirements.txt .
RUN python -m pip install --no-cache-dir torch==2.1.2 --index-url https://download.pytorch.org/whl/cpu \
    && python -m pip install --no-cache-dir -r requirements.txt
COPY app.py data_sources.py ./
USER 10001:10001
ENV HF_HOME=/tmp/huggingface
EXPOSE 5000
CMD ["sh", "-c", "exec gunicorn --bind 0.0.0.0:${PORT:-5000} --workers 1 --threads 2 --timeout 180 app:app"]
