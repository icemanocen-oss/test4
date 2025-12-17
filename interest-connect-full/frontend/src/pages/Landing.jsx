import { Link } from 'react-router-dom';
import { Users, Brain, Shield, MessageCircle, Calendar, Search, ArrowRight } from 'lucide-react';

const features = [
  { icon: Brain, title: 'AI-Powered Matching', description: 'Our smart algorithm finds users with similar interests, skills, and goals.' },
  { icon: Users, title: 'Join Communities', description: 'Create or join groups based on study subjects, hobbies, or professional interests.' },
  { icon: Shield, title: 'Safe & Secure', description: 'Verified accounts, privacy controls, and secure messaging keep you safe.' },
  { icon: MessageCircle, title: 'Real-Time Chat', description: 'Connect instantly with matched users through our real-time messaging system.' },
  { icon: Calendar, title: 'Schedule Events', description: 'Organize study sessions, meetups, and collaborative projects with ease.' },
  { icon: Search, title: 'Advanced Search', description: 'Filter by interests, location, user type, and more to find the perfect match.' },
];

const steps = [
  { num: 1, title: 'Create Your Profile', desc: 'Sign up and add your interests, skills, and what you\'re looking for.' },
  { num: 2, title: 'Get Matched', desc: 'Our AI finds users with similar interests and goals.' },
  { num: 3, title: 'Start Connecting', desc: 'Chat, join groups, and schedule meetups with your matches.' },
];

export default function Landing() {
  return (
    <div className="min-h-screen">
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl gradient-text">InterestConnect</span>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/login" className="text-gray-600 hover:text-gray-900 font-medium">
                Login
              </Link>
              <Link to="/register" className="btn btn-primary">
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <section className="gradient-bg text-white py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="fade-in">
              <h1 className="text-4xl lg:text-5xl font-bold mb-6 leading-tight">
                Find People Who Share Your Interests
              </h1>
              <p className="text-xl text-white/90 mb-8">
                Connect with study partners, project teammates, and hobbyists who share your passions. 
                Join InterestConnect today!
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/register" className="btn bg-white text-primary-700 hover:bg-gray-100 text-lg px-8 py-3">
                  Get Started <ArrowRight className="w-5 h-5" />
                </Link>
                <a href="#features" className="btn border-2 border-white text-white hover:bg-white/10 text-lg px-8 py-3">
                  Learn More
                </a>
              </div>
              <p className="mt-6 text-white/70 flex items-center gap-2">
                <Users className="w-5 h-5" /> Join 1000+ students and professionals
              </p>
            </div>
            <div className="hidden lg:block">
              <img 
                src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&h=400&fit=crop"
                alt="People connecting"
                className="rounded-2xl shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Why Choose InterestConnect?</h2>
            <p className="text-gray-600 text-lg">Everything you need to find the perfect partner</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="card p-6 hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">How It Works</h2>
            <p className="text-gray-600 text-lg">Get started in 3 simple steps</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step) => (
              <div key={step.num} className="text-center">
                <div className="w-16 h-16 rounded-full gradient-bg text-white text-2xl font-bold flex items-center justify-center mx-auto mb-4">
                  {step.num}
                </div>
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-gray-600">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="gradient-bg py-20">
        <div className="max-w-4xl mx-auto px-4 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to Find Your Perfect Match?</h2>
          <p className="text-xl text-white/90 mb-8">
            Join thousands of students and professionals connecting through shared interests.
          </p>
          <Link to="/register" className="btn bg-white text-primary-700 hover:bg-gray-100 text-lg px-10 py-4">
            Create Free Account
          </Link>
        </div>
      </section>

      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-6 h-6" />
                <span className="font-bold text-lg">InterestConnect</span>
              </div>
              <p className="text-gray-400">Connecting people through shared interests.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#features" className="hover:text-white">Features</a></li>
                <li><Link to="/login" className="hover:text-white">Login</Link></li>
                <li><Link to="/register" className="hover:text-white">Sign Up</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Project By</h4>
              <p className="text-gray-400">Rustem & Daulet<br/>Final Project 2024</p>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 InterestConnect. Student Project.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
