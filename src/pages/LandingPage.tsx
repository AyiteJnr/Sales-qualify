import React, { useState, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { 
  ArrowRight, 
  BarChart3, 
  Users, 
  Phone, 
  MessageSquare, 
  Building2, 
  Target, 
  TrendingUp, 
  CheckCircle, 
  Star,
  Play,
  Download,
  Zap,
  Shield,
  Globe,
  Headphones,
  FileText,
  Calendar,
  PieChart,
  Activity,
  Bot,
  Database,
  Cloud,
  Smartphone,
  Laptop,
  Monitor,
  DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
  const navigate = useNavigate();
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], [0, -50]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Sales Director",
      company: "TechCorp Inc.",
      content: "This platform transformed our sales process. We've seen a 300% increase in lead conversion rates.",
      avatar: "SJ",
      rating: 5
    },
    {
      name: "Michael Chen",
      role: "VP of Sales",
      company: "Global Solutions",
      content: "The real-time analytics and CRM integration is game-changing. Our team productivity has doubled.",
      avatar: "MC",
      rating: 5
    },
    {
      name: "Emily Rodriguez",
      role: "Sales Manager",
      company: "InnovateCo",
      content: "The call recording and transcription features have revolutionized how we track and improve our sales calls.",
      avatar: "ER",
      rating: 5
    }
  ];

  const features = [
    {
      icon: <BarChart3 className="h-8 w-8" />,
      title: "Real-Time Analytics",
      description: "Track performance with live dashboards and comprehensive reporting",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: <Phone className="h-8 w-8" />,
      title: "Call Recording & AI Transcription",
      description: "Record calls with automatic transcription and AI-powered insights",
      color: "from-green-500 to-emerald-500"
    },
    {
      icon: <Users className="h-8 w-8" />,
      title: "Team Management",
      description: "Manage sales reps, assign leads, and track individual performance",
      color: "from-purple-500 to-violet-500"
    },
    {
      icon: <Building2 className="h-8 w-8" />,
      title: "Enterprise CRM",
      description: "Complete CRM with companies, contacts, deals, and activity tracking",
      color: "from-orange-500 to-red-500"
    },
    {
      icon: <MessageSquare className="h-8 w-8" />,
      title: "Team Messaging",
      description: "Internal communication system with real-time messaging and notifications",
      color: "from-pink-500 to-rose-500"
    },
    {
      icon: <Target className="h-8 w-8" />,
      title: "Lead Qualification",
      description: "Smart lead scoring and qualification with automated workflows",
      color: "from-indigo-500 to-blue-500"
    }
  ];

  const stats = [
    { number: "300%", label: "Increase in Conversion" },
    { number: "50%", label: "Time Saved" },
    { number: "99.9%", label: "Uptime" },
    { number: "24/7", label: "Support" }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [testimonials.length]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Navigation */}
      <motion.nav 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-200"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <motion.div 
              className="flex items-center space-x-2"
              whileHover={{ scale: 1.05 }}
            >
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Target className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                SalesQualify
              </span>
            </motion.div>
            
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-600 hover:text-blue-600 transition-colors">Features</a>
              <a href="#testimonials" className="text-gray-600 hover:text-blue-600 transition-colors">Testimonials</a>
              <a href="#contact" className="text-gray-600 hover:text-blue-600 transition-colors">Contact</a>
            </div>

            <div className="flex items-center space-x-4">
              <Button 
                variant="outline" 
                onClick={() => navigate('/auth')}
                className="hidden sm:inline-flex"
              >
                Sign In
              </Button>
              <Button 
                onClick={() => navigate('/auth')}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Floating background elements */}
        <div className="absolute inset-0 -z-10">
          <motion.div
            animate={{ 
              y: [0, -20, 0],
              rotate: [0, 5, 0]
            }}
            transition={{ 
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute top-20 left-10 w-20 h-20 bg-blue-200 rounded-full opacity-20"
          />
          <motion.div
            animate={{ 
              y: [0, 20, 0],
              rotate: [0, -5, 0]
            }}
            transition={{ 
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute top-40 right-20 w-16 h-16 bg-purple-200 rounded-full opacity-20"
          />
          <motion.div
            animate={{ 
              y: [0, -15, 0],
              x: [0, 10, 0]
            }}
            transition={{ 
              duration: 7,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute bottom-20 left-1/4 w-12 h-12 bg-indigo-200 rounded-full opacity-20"
          />
        </div>
        <div className="max-w-7xl mx-auto relative">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="mb-8"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6 }}
              >
                <Badge className="mb-4 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 border-blue-200 text-sm px-4 py-2">
                  🚀 New: AI-Powered Call Transcription & Analytics
                </Badge>
              </motion.div>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6">
                <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent">
                  Transform Your
                </span>
                <br />
                <span className="text-gray-900">Sales Process</span>
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
                The complete sales qualification platform with AI-powered insights, 
                real-time analytics, and enterprise CRM capabilities that transform how teams sell.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12"
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button 
                  size="lg"
                  onClick={() => navigate('/auth')}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg px-8 py-4 h-auto relative overflow-hidden"
                >
                  <motion.div
                    animate={{ 
                      scale: [1, 1.1, 1],
                      opacity: [0.7, 1, 0.7]
                    }}
                    transition={{ 
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent"
                  />
                  <span className="relative z-10">Get Started Now</span>
                  <ArrowRight className="ml-2 h-5 w-5 relative z-10" />
                </Button>
              </motion.div>
              <Button 
                size="lg"
                variant="outline"
                className="text-lg px-8 py-4 h-auto border-2"
              >
                <Play className="mr-2 h-5 w-5" />
                Watch Demo
              </Button>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto"
            >
              {stats.map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
                  className="text-center"
                >
                  <div className="text-3xl md:text-4xl font-bold text-blue-600 mb-2">
                    {stat.number}
                  </div>
                  <div className="text-gray-600 font-medium">
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6">
              Everything You Need to
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> Scale Sales</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-4xl mx-auto">
              Advanced features designed to streamline your sales process, boost team performance, and drive revenue growth
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -5, scale: 1.02 }}
                className="group"
              >
                <Card className="h-full border-0 shadow-lg hover:shadow-2xl transition-all duration-300 bg-gradient-to-br from-white to-gray-50">
                  <CardContent className="p-8">
                    <motion.div
                      className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${feature.color} flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform duration-300`}
                      whileHover={{ rotate: 5 }}
                    >
                      {feature.icon}
                    </motion.div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Dashboard Preview */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6">
              Powerful, Intelligent
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> Dashboards</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-4xl mx-auto">
              Experience the power of our intelligent, responsive interface designed for maximum productivity and seamless workflow
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-200">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-4">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                </div>
                <div className="text-sm text-gray-500">SalesQualify Dashboard</div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: "Total Leads", value: "1,247", color: "blue", icon: <Users className="h-5 w-5" /> },
                      { label: "Calls Today", value: "89", color: "green", icon: <Phone className="h-5 w-5" /> },
                      { label: "Conversion", value: "23.4%", color: "purple", icon: <TrendingUp className="h-5 w-5" /> },
                      { label: "Revenue", value: "$45.2K", color: "orange", icon: <DollarSign className="h-5 w-5" /> }
                    ].map((stat, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                        className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className={`p-2 rounded-lg bg-${stat.color}-100`}>
                            <div className={`text-${stat.color}-600`}>{stat.icon}</div>
                          </div>
                          <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                        </div>
                        <div className="text-sm text-gray-600">{stat.label}</div>
                      </motion.div>
                    ))}
                  </div>
                  
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                    <div className="space-y-3">
                      {[
                        "New lead assigned to Sarah Johnson",
                        "Call completed with Acme Corp",
                        "Deal closed: $12,500 software license",
                        "Follow-up scheduled for tomorrow"
                      ].map((activity, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.5, delay: index * 0.1 }}
                          className="flex items-center space-x-3"
                        >
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span className="text-gray-700">{activity}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-6">
                  <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Performance</h3>
                    <div className="space-y-4">
                      {[
                        { name: "Sarah Johnson", calls: 23, conversion: "28%" },
                        { name: "Mike Chen", calls: 19, conversion: "31%" },
                        { name: "Emily Davis", calls: 17, conversion: "24%" }
                      ].map((rep, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 10 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.5, delay: index * 0.1 }}
                          className="flex items-center justify-between"
                        >
                          <div>
                            <div className="font-medium text-gray-900">{rep.name}</div>
                            <div className="text-sm text-gray-600">{rep.calls} calls</div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-green-600">{rep.conversion}</div>
                            <div className="text-xs text-gray-500">conversion</div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6">
              Trusted by Sales Teams
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> Worldwide</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              See what our customers are saying about their success with SalesQualify
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <Card className="max-w-4xl mx-auto border-0 shadow-2xl bg-gradient-to-br from-blue-50 to-purple-50">
              <CardContent className="p-12">
                <div className="text-center">
                  <div className="flex justify-center mb-6">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-6 w-6 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <blockquote className="text-2xl md:text-3xl font-medium text-gray-900 mb-8 leading-relaxed">
                    "{testimonials[currentTestimonial].content}"
                  </blockquote>
                  <div className="flex items-center justify-center space-x-4">
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xl font-bold">
                      {testimonials[currentTestimonial].avatar}
                    </div>
                    <div className="text-left">
                      <div className="text-xl font-semibold text-gray-900">
                        {testimonials[currentTestimonial].name}
                      </div>
                      <div className="text-gray-600">
                        {testimonials[currentTestimonial].role} at {testimonials[currentTestimonial].company}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
              Ready to Transform Your Sales Process?
            </h2>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Join thousands of sales teams who have already revolutionized their workflow with SalesQualify
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button 
                  size="lg"
                  onClick={() => navigate('/auth')}
                  className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-8 py-4 h-auto relative overflow-hidden"
                >
                  <motion.div
                    animate={{ 
                      scale: [1, 1.1, 1],
                      opacity: [0.7, 1, 0.7]
                    }}
                    transition={{ 
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="absolute inset-0 bg-gradient-to-r from-blue-100/50 to-transparent"
                  />
                  <span className="relative z-10">Get Started Now</span>
                  <ArrowRight className="ml-2 h-5 w-5 relative z-10" />
                </Button>
              </motion.div>
              <Button 
                size="lg"
                variant="outline"
                className="border-white text-white hover:bg-white hover:text-blue-600 text-lg px-8 py-4 h-auto"
              >
                <Download className="mr-2 h-5 w-5" />
                Download Brochure
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <Target className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold">SalesQualify</span>
              </div>
              <p className="text-gray-400 mb-4">
                The complete sales qualification platform for modern teams.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Integrations</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Status</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Community</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; 2024 SalesQualify. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
