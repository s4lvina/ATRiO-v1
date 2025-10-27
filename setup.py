"""
Setup script para ATRiO v1
"""

from setuptools import setup, find_packages
import os


# Leer README
def read_readme():
    with open("README.md", "r", encoding="utf-8") as fh:
        return fh.read()


# Leer requirements
def read_requirements():
    with open("requirements.txt", "r", encoding="utf-8") as fh:
        return [line.strip() for line in fh if line.strip() and not line.startswith("#")]


setup(
    name="atrio",
    version="1.0.0",
    author="ATRiO Development Team",
    author_email="atrio@example.com",
    description="Sistema de análisis e investigación de datos LPR y GPS",
    long_description=read_readme(),
    long_description_content_type="text/markdown",
    url="https://github.com/your-org/atrio",
    packages=find_packages(),
    classifiers=[
        "Development Status :: 5 - Production/Stable",
        "Intended Audience :: Law Enforcement",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.11",
        "Topic :: Scientific/Engineering :: Information Analysis",
        "Topic :: Security",
    ],
    python_requires=">=3.11",
    install_requires=read_requirements(),
    extras_require={
        "dev": [
            "pytest>=7.4.3",
            "pytest-asyncio>=0.21.1",
            "pytest-cov>=4.1.0",
            "pytest-mock>=3.12.0",
            "black>=23.11.0",
            "flake8>=6.1.0",
            "mypy>=1.7.1",
            "bandit>=1.7.5",
            "safety>=2.3.5",
            "locust>=2.15.1",
        ],
        "redis": [
            "redis>=5.0.1",
        ],
    },
    entry_points={
        "console_scripts": [
            "atrio=main:main",
        ],
    },
    include_package_data=True,
    package_data={
        "": ["*.md", "*.txt", "*.yml", "*.yaml"],
    },
    keywords="lpr gps analysis investigation law-enforcement",
    project_urls={
        "Bug Reports": "https://github.com/your-org/atrio/issues",
        "Source": "https://github.com/your-org/atrio",
        "Documentation": "https://github.com/your-org/atrio/docs",
    },
)
