from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field


ApplicationStatus = Literal["Under review", "Shortlisted", "Rejected", "Hired"]


class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    phone: str = Field(min_length=7, max_length=25)
    password: str = Field(min_length=8, max_length=128)
    role: Literal["driver", "employer"]
    company: str = ""


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ProfileUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=100)
    phone: Optional[str] = Field(default=None, min_length=7, max_length=25)
    location: str = ""
    category: str = "Car Driver"
    experience: int = Field(default=0, ge=0, le=60)
    licence_category: str = ""
    skills: str = ""
    resume_filename: str = ""


class JobCreate(BaseModel):
    title: str = Field(min_length=2, max_length=150)
    category: str
    company: str
    location: str
    salary: int = Field(ge=0)
    experience: int = Field(default=0, ge=0, le=60)
    working_hours: str = ""
    required_documents: str = ""
    description: str = Field(min_length=5, max_length=5000)


class ApplicationStatusUpdate(BaseModel):
    status: ApplicationStatus
